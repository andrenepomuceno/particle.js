import { createProgram, ExpressionError, type Handle, type Limits, type Program } from 'shader-autodiff';
import { CONSTANTS, FUNCTION_ARITY, bin, collectVariables, num, toInfix, variable, type Expr } from '../expr/ast';
import { colorDot, colorPlane } from '../colorCharge';
import type { CompiledFn } from '../expr/evaluate';
import type { Vec3 } from '../particles';
import { ExprError, parseExpr } from '../expr/parser';
import { simplify } from '../expr/simplify';
import type { ForceDefinition } from './types';
import { PAIR_VARIABLES, PAIR_VARIABLE_NAMES } from './variables';

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
/**
 * shader-autodiff's guards, raised well above its defaults: toInfix parenthesises every operation
 * (depth grows with each term), and integer powers are unrolled by squaring, so r^-48 is cheap.
 */
const LIMITS: Partial<Limits> = { maxExponent: 1024, maxDepth: 1000, maxLength: 200_000, maxNodes: 50_000 };
/** Smallest normal and largest finite float32: constants outside are 0 or ∞ on the GPU but not on the CPU. */
const FLOAT32_MIN = 1.1754944e-38;
const FLOAT32_MAX = 3.4028235e38;
// 'soft2' and 'cutoff' become uniforms uF<k>_<name>; '__' is reserved in GLSL, so names may not start with '_'.
const RESERVED = new Set([...PAIR_VARIABLE_NAMES, ...Object.keys(CONSTANTS), ...Object.keys(FUNCTION_ARITY), 'soft2', 'cutoff']);

/**
 * A force compiled through shader-autodiff: one graph per force (shared subexpressions, F = -dV/dr
 * differentiated exactly) feeds the GPU shaders, the float64 reference and the UI plot alike.
 */
export interface CompiledForce {
  definition: ForceDefinition;
  /** Pair variables, parameters and `cutoff` the force magnitude reads (r excluded). */
  reads: ReadonlySet<string>;
  /** Same for V(r); empty in force mode. */
  potentialReads: ReadonlySet<string>;
  /** Signed force magnitude as a function of r; positive pushes the pair apart. */
  evaluate: CompiledFn;
  /** V(r) for potential-mode forces; force-mode expressions have no known potential. */
  evaluatePotential: CompiledFn | undefined;
  /** GLSL `float <name>(<args>)` returning the magnitude (or V with `potential`), uniforms named for force `index`. */
  glsl(name: string, args: string, index: number, which?: 'magnitude' | 'potential'): string;
}

export class ForceValidationError extends Error {
  constructor(readonly forceName: string, readonly problems: string[]) {
    super(`force '${forceName}': ${problems.join('; ')}`);
    this.name = 'ForceValidationError';
  }
}

export function validateForceShape(def: ForceDefinition): string[] {
  const problems: string[] = [];
  if (def.range === 'short' && !(Number.isFinite(def.cutoff) && def.cutoff > 0)) {
    problems.push(`cutoff must be a finite number > 0 for a short-range force, got ${def.cutoff}`);
  }
  if (!(Number.isFinite(def.softening) && def.softening >= 0)) {
    problems.push(`softening must be a finite number >= 0, got ${def.softening}`);
  }
  const seen = new Set<string>();
  for (const param of def.params) {
    if (!IDENTIFIER.test(param.name)) problems.push(`parameter name '${param.name}' is not a valid identifier`);
    else if (param.name.startsWith('_') || param.name.includes('__')) problems.push(`parameter name '${param.name}' may not start with '_' or contain '__'`);
    else if (RESERVED.has(param.name)) problems.push(`parameter name '${param.name}' is reserved`);
    else if (seen.has(param.name)) problems.push(`parameter '${param.name}' is declared twice`);
    else {
      const clash = libraryNameProblem(param.name);
      if (clash) problems.push(`parameter name '${param.name}' is reserved in generated shader code (${clash})`);
    }
    seen.add(param.name);
    if (!Number.isFinite(param.value)) problems.push(`parameter '${param.name}' must be finite, got ${param.value}`);
  }
  return problems;
}

/** shader-autodiff refuses names that clash with GLSL/WGSL/JS keywords and its built-ins. */
function libraryNameProblem(name: string): string | undefined {
  try {
    createProgram({ parameters: [name] });
    return undefined;
  } catch (error) {
    return (error as Error).message;
  }
}

export function compileForce(def: ForceDefinition): CompiledForce {
  const problems = validateForceShape(def);
  let parsed: Expr | undefined;
  try {
    parsed = parseExpr(def.expression);
  } catch (error) {
    if (!(error instanceof ExprError)) throw error;
    problems.push(error.message);
  }
  if (parsed) problems.push(...unknownVariables(def, parsed));
  if (parsed && def.mode === 'potential') {
    const directional = [...collectVariables(parsed)].filter((name) => PAIR_VARIABLES.find((v) => v.name === name)?.directional);
    if (directional.length > 0) {
      problems.push(`${directional.join(', ')} depend on the pair's direction, which F = -dV/dr cannot account for (it would need a torque); write the force in force mode instead`);
    }
  }
  if (problems.length > 0 || !parsed) throw new ForceValidationError(def.name, problems);

  const inR = simplify(substitute(parsed, 'x', bin('/', variable('r'), variable('cutoff'))));
  const badConstants = outOfFloat32(inR);
  const nonFinite = badConstants.filter((c) => !Number.isFinite(c));
  if (nonFinite.length > 0) {
    throw new ForceValidationError(def.name, [`expression folds to a non-finite constant (${nonFinite.join(', ')}); check divisions by zero and log/sqrt of non-positive numbers`]);
  }
  if (badConstants.length > 0) {
    throw new ForceValidationError(def.name, [`constant(s) ${badConstants.join(', ')} outside float32 range (|c| between ${FLOAT32_MIN} and ${FLOAT32_MAX}, or 0): the GPU would compute 0 or ∞ while the CPU would not; rescale the units`]);
  }
  const names = [...collectVariables(inR)].filter((name) => name !== 'r' && !(name in CONSTANTS));
  let program: Program;
  let magnitude: Handle;
  let potential: Handle | undefined;
  try {
    program = createProgram({ variables: ['r'], parameters: names, limits: LIMITS });
    const source = program.expression(toInfix(Object.entries(CONSTANTS).reduce((e, [name, value]) => substitute(e, name, num(value)), inR)));
    potential = def.mode === 'potential' ? source : undefined;
    magnitude = potential === undefined ? source : program.neg(program.derivative(potential, 'r'));
  } catch (error) {
    // Offsets in library messages point into our generated text, not what the user typed.
    throw new ForceValidationError(def.name, [error instanceof ExpressionError ? error.reason : (error as Error).message]);
  }
  const reads = readNames(program, magnitude, names);
  const potentialReads = potential === undefined ? new Set<string>() : readNames(program, potential, names);
  const compiled: CompiledForce = {
    definition: def,
    reads,
    potentialReads,
    evaluate: jsFunction(program, magnitude),
    evaluatePotential: potential === undefined ? undefined : jsFunction(program, potential),
    glsl: (name, args, index, which = 'magnitude') => {
      const handle = which === 'potential' ? potential : magnitude;
      if (handle === undefined) throw new Error(`force '${def.name}' has no potential (force mode)`);
      return glslFunction(program, handle, name, args, index, def, which === 'potential' ? potentialReads : reads);
    },
  };
  // Emit once now so code-generation failures surface as validation problems, not at shader build.
  try {
    compiled.glsl('check', 'float r', 0);
    if (potential !== undefined) compiled.glsl('check', 'float r', 0, 'potential');
  } catch (error) {
    throw new ForceValidationError(def.name, [(error as Error).message]);
  }
  return compiled;
}

/** Names the emitted code of `handle` actually uses: a term constant in r drops out of -dV/dr. */
function readNames(program: Program, handle: Handle, names: readonly string[]): Set<string> {
  const glsl = program.glsl({ name: 'reads', returns: { type: 'float', components: [handle] } });
  const used = new Set(glsl.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g));
  return new Set(names.filter((name) => used.has(name)));
}

/** The library's emitted JS, wrapped to the scope-in, number-out shape the CPU code uses. */
function jsFunction(program: Program, handle: Handle): CompiledFn {
  const source = program.js({ name: 'f', returns: { type: 'float', components: [handle] } });
  const fn = new Function(`${source}\nreturn f;`)() as (scope: Readonly<Record<string, number>>) => { value: number };
  return (scope) => fn(scope).value;
}

/**
 * GLSL from the library with r as the only argument, renamed to our uniforms and pair-variable
 * bindings, then given the full pair signature. pow() becomes spow(): GLSL's pow is undefined for
 * negative bases, while q^n with an odd integer n must behave like Math.pow (the JS side).
 */
function glslFunction(program: Program, handle: Handle, name: string, args: string, index: number, def: ForceDefinition, reads: ReadonlySet<string>): string {
  const params = new Set(def.params.map((p) => p.name));
  const byName = new Map(PAIR_VARIABLES.map((v) => [v.name, v.glsl]));
  const cutoff = forceUniformName(index, 'cutoff');
  const parameters = Object.fromEntries([...reads].map((n) => {
    if (n === 'cutoff') return [n, cutoff];
    if (params.has(n)) return [n, forceUniformName(index, n)];
    const glsl = byName.get(n);
    if (glsl === undefined) throw new Error(`no GLSL binding for variable '${n}'`);
    return [n, glsl.replaceAll('CUTOFF', cutoff)];
  }));
  const glsl = program.glsl({ name, returns: { type: 'float', components: [handle] }, parameters });
  const header = `float ${name}(float r) {`;
  if (!glsl.startsWith(header)) throw new Error(`unexpected shader-autodiff header: ${glsl.split('\n')[0]}`);
  return `float ${name}(${args}) {${glsl.slice(header.length).replaceAll(/\bpow\(/g, 'spow(')}`;
}

function unknownVariables(def: ForceDefinition, expr: Expr): string[] {
  const params = new Set(def.params.map((p) => p.name));
  const allowed = PAIR_VARIABLES.filter((v) => def.range === 'short' || !v.shortRangeOnly).map((v) => v.name);
  const allowedSet = new Set(allowed);
  return [...collectVariables(expr)]
    .filter((name) => !allowedSet.has(name) && !params.has(name) && !(name in CONSTANTS))
    .map((name) => {
      const hint = PAIR_VARIABLES.find((v) => v.name === name)?.shortRangeOnly
        ? ' (only available for short-range forces)'
        : `; declare it as a parameter or use one of: ${allowed.join(', ')}`;
      return `unknown variable '${name}'${hint}`;
    });
}

function outOfFloat32(expr: Expr, found: number[] = []): number[] {
  switch (expr.kind) {
    case 'num':
      if (expr.value !== 0 && !(Math.abs(expr.value) >= FLOAT32_MIN && Math.abs(expr.value) <= FLOAT32_MAX)) found.push(expr.value);
      break;
    case 'var':
      break;
    case 'neg':
      outOfFloat32(expr.arg, found);
      break;
    case 'bin':
      outOfFloat32(expr.left, found);
      outOfFloat32(expr.right, found);
      break;
    case 'call':
      expr.args.forEach((arg) => outOfFloat32(arg, found));
      break;
  }
  return found;
}

function substitute(expr: Expr, name: string, replacement: Expr): Expr {
  switch (expr.kind) {
    case 'num': return expr;
    case 'var': return expr.name === name ? replacement : expr;
    case 'neg': return { kind: 'neg', arg: substitute(expr.arg, name, replacement) };
    case 'bin': return { ...expr, left: substitute(expr.left, name, replacement), right: substitute(expr.right, name, replacement) };
    case 'call': return { ...expr, args: expr.args.map((arg) => substitute(arg, name, replacement)) };
  }
}

export function forceUniformName(forceIndex: number, name: string): string {
  return `uF${forceIndex}_${name}`;
}

export interface PairScope {
  r: number;
  m_i: number; m_j: number;
  q_i: number; q_j: number;
  q2_i: number; q2_j: number;
  i3_i: number; i3_j: number;
  sx_i: number; sy_i: number; sz_i: number;
  sx_j: number; sy_j: number; sz_j: number;
  /** Unit vector from j to i (the direction F > 0 pushes i). */
  ux: number; uy: number; uz: number;
  p_i: number; p_j: number;
  n_i: number; n_j: number;
  cr_i: number; cg_i: number; cb_i: number;
  cr_j: number; cg_j: number; cb_j: number;
  t_i: number; t_j: number;
  time: number;
}

export function forceScope(force: CompiledForce, pair: PairScope): Record<string, number> {
  const colorI: Vec3 = [pair.cr_i, pair.cg_i, pair.cb_i];
  const colorJ: Vec3 = [pair.cr_j, pair.cg_j, pair.cb_j];
  const [cx_i, cy_i] = colorPlane(colorI);
  const [cx_j, cy_j] = colorPlane(colorJ);
  const scope: Record<string, number> = {
    ...pair,
    cx_i, cy_i, cx_j, cy_j,
    c_dot: colorDot(colorI, colorJ),
    q_dot: pair.q_i * pair.q_j + pair.q2_i * pair.q2_j,
    s_dot: pair.sx_i * pair.sx_j + pair.sy_i * pair.sy_j + pair.sz_i * pair.sz_j,
    si_r: pair.sx_i * pair.ux + pair.sy_i * pair.uy + pair.sz_i * pair.uz,
    sj_r: pair.sx_j * pair.ux + pair.sy_j * pair.uy + pair.sz_j * pair.uz,
    cutoff: force.definition.cutoff,
  };
  for (const param of force.definition.params) scope[param.name] = param.value;
  return scope;
}
