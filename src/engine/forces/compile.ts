import { createProgram, ExpressionError, type Handle, type Limits, type Program } from 'shader-autodiff';
import { CONSTANTS, FUNCTION_ARITY, bin, call, collectVariables, num, toInfix, variable, type Expr } from '../expr/ast';
import { lowerVectors, VectorTypeError, type Lowered } from '../expr/vector';
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
/** Components of Δx = x_i − x_j: in a potential they make the force the vector −∇V. */
export const RELATIVE_POSITION = ['dx', 'dy', 'dz'] as const;
/** Directional variables make a potential a vector potential (F = −∇V). */
const VECTOR_TRIGGERS = new Set(PAIR_VARIABLES.filter((v) => v.directional).map((v) => v.name));
/** v_i's components: the variables of vector forces (∂F/∂v_i for the implicit velocity update). */
const VELOCITY_I_COMPONENTS = ['vx_i', 'vy_i', 'vz_i'] as const;
const VELOCITY_I = new Set<string>(VELOCITY_I_COMPONENTS);
/** Names that depend on velocity (catalogue flag), refused in potential mode. */
const VELOCITY = new Set(PAIR_VARIABLES.filter((v) => v.velocity).map((v) => v.name));
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
  /**
   * central: a magnitude along r̂. gradient: a potential of the relative position (reads dx, dy, dz,
   * si_r or sj_r), whose force is −∇V. vector: a force-mode expression that is a vector or reads
   * v_i, applied as written (e.g. q v_i × B).
   */
  kind: 'central' | 'gradient' | 'vector';
  /** Not central (gradient or vector): the force is a vec3 per pair. */
  vector: boolean;
  /** A vector force that reads v_i: its Jacobian ∂F/∂v_i drives the implicit velocity update. */
  jacobian: boolean;
  /** Signed force magnitude as a function of r; positive pushes the pair apart (radial part for vector forces). */
  evaluate: CompiledFn;
  /** The full force on i (−∇_{Δx} V for gradient forces). */
  evaluateVector: ((scope: Readonly<Record<string, number>>) => Vec3) | undefined;
  /** ∂F_k/∂v_i,l as rows [k][l], for forces with `jacobian`. */
  evaluateJacobian: ((scope: Readonly<Record<string, number>>) => [Vec3, Vec3, Vec3]) | undefined;
  /** V(r) for potential-mode forces; force-mode expressions have no known potential. */
  evaluatePotential: CompiledFn | undefined;
  /**
   * GLSL function `name`: the magnitude (float), the force (vec3), or V with `potential`; uniforms
   * named for force `index`. Its first argument is the library's variable (`float r`; `vec3 p` = Δx
   * for gradient forces, = v_i for vector forces), followed by `args`. A force with `jacobian` is
   * `void name(vec3 p, <args>, out vec3 F, out mat3 J)` instead (J column-major: J[l][k] = ∂F_k/∂v_l).
   */
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
    const velocity = [...collectVariables(parsed)].filter((name) => VELOCITY.has(name));
    if (velocity.length > 0) problems.push(`${velocity.join(', ')} depend on velocity, which a potential cannot (F = −∇V); use force mode`);
  }
  let lowered: Lowered | undefined;
  if (parsed && problems.length === 0) {
    try {
      lowered = lowerVectors(parsed);
    } catch (error) {
      if (!(error instanceof VectorTypeError)) throw error;
      problems.push(error.message);
    }
    if (lowered?.kind === 'vector' && def.mode === 'potential') problems.push('a potential must be a number, but this expression is a vector');
  }
  if (problems.length > 0 || !lowered) throw new ForceValidationError(def.name, problems);

  const inX = (e: Expr) => simplify(substitute(e, 'x', bin('/', variable('r'), variable('cutoff'))));
  const parts = lowered.kind === 'scalar' ? [inX(lowered.expr)] : lowered.components.map(inX);
  const inR = parts[0]!;
  const badConstants = parts.flatMap((e) => outOfFloat32(e));
  const nonFinite = badConstants.filter((c) => !Number.isFinite(c));
  if (nonFinite.length > 0) {
    throw new ForceValidationError(def.name, [`expression folds to a non-finite constant (${nonFinite.join(', ')}); check divisions by zero and log/sqrt of non-positive numbers`]);
  }
  if (badConstants.length > 0) {
    throw new ForceValidationError(def.name, [`constant(s) ${badConstants.join(', ')} outside float32 range (|c| between ${FLOAT32_MIN} and ${FLOAT32_MAX}, or 0): the GPU would compute 0 or ∞ while the CPU would not; rescale the units`]);
  }
  const names = [...new Set(parts.flatMap((e) => [...collectVariables(e)]))].filter((name) => name !== 'r' && !(name in CONSTANTS));
  const readsVelocityI = names.some((name) => VELOCITY_I.has(name));
  const kind = def.mode === 'force'
    ? (lowered.kind === 'vector' || readsVelocityI ? 'vector' : 'central')
    : (names.some((name) => VECTOR_TRIGGERS.has(name)) ? 'gradient' : 'central');
  const built = kind === 'gradient' ? buildVector(def, inR, names)
    : kind === 'vector' ? buildVectorForce(def, lowered.kind === 'vector' ? parts : radialComponents(inR), names, readsVelocityI)
      : buildCentral(def, inR, names);
  const { program, potential } = built;
  const vectorJs = kind === 'central' ? undefined : forceJs(program, built.force, built.jacobian);
  const compiled: CompiledForce = {
    definition: def,
    kind,
    vector: kind !== 'central',
    jacobian: built.jacobian !== undefined,
    reads: readNames(program, [...built.force, ...(built.jacobian ?? [])], built.parameters),
    potentialReads: potential === undefined ? new Set<string>() : readNames(program, [potential], built.parameters),
    evaluate: jsFunction(program, built.radial),
    evaluateVector: vectorJs && ((scope) => vectorJs(scope).F),
    evaluateJacobian: vectorJs && built.jacobian ? (scope) => vectorJs(scope).J! : undefined,
    evaluatePotential: potential === undefined ? undefined : jsFunction(program, potential),
    glsl: (name, args, index, which = 'magnitude') => {
      if (which === 'potential' && potential === undefined) throw new Error(`force '${def.name}' has no potential (force mode)`);
      const names = which === 'potential' ? compiled.potentialReads : compiled.reads;
      if (which === 'potential') return glslFunction(program, [potential!], undefined, built.variables, name, args, index, def, [...names]);
      return glslFunction(program, built.force, built.jacobian, built.variables, name, args, index, def, [...names]);
    },
  };
  // Emit once now so code-generation failures surface as validation problems, not at shader build.
  try {
    compiled.glsl('check', 'float unused', 0);
    if (potential !== undefined) compiled.glsl('check', 'float unused', 0, 'potential');
  } catch (error) {
    throw new ForceValidationError(def.name, [(error as Error).message]);
  }
  return compiled;
}

interface Built {
  program: Program;
  /** Library variables, in argument order: r, or dx, dy, dz. */
  variables: readonly string[];
  /** Everything else the program reads, renamed to uniforms and pair bindings in GLSL. */
  parameters: readonly string[];
  /** ∂F/∂v_i column-major (9 handles), for vector forces that read v_i. */
  jacobian?: Handle[];
  /** [F] for central forces, [Fx, Fy, Fz] for vector forces. */
  force: Handle[];
  /** The signed magnitude along r̂ (for the plot and CPU references of central forces). */
  radial: Handle;
  potential: Handle | undefined;
}

/** The library's text for our AST: named constants as numbers (the library spells e as E). */
function librarySource(inR: Expr): string {
  return toInfix(Object.entries(CONSTANTS).reduce((e, [name, value]) => substitute(e, name, num(value)), inR));
}

function withProgram<T>(def: ForceDefinition, build: () => T): T {
  try {
    return build();
  } catch (error) {
    // Offsets in library messages point into our generated text, not what the user typed.
    throw new ForceValidationError(def.name, [error instanceof ExpressionError ? error.reason : (error as Error).message]);
  }
}

/**
 * A potential is a function of the softened r = √(d² + ε²), so its exact force along r̂ is
 * −dV/dd = −V'(r)·d/r (Plummer softening; energy is conserved). d/r = √(r² − ε²)/r is 1 without
 * softening; it is built from soft2 so the factor follows softening changes without a recompile.
 */
function buildCentral(def: ForceDefinition, inR: Expr, names: string[]): Built {
  const parameters = def.mode === 'potential' ? [...new Set([...names, 'soft2'])] : names;
  return withProgram(def, () => {
    const program = createProgram({ variables: ['r'], parameters, limits: LIMITS });
    const source = program.expression(librarySource(inR));
    const potential = def.mode === 'potential' ? source : undefined;
    const magnitude = potential === undefined
      ? source
      : program.mul(program.neg(program.derivative(potential, 'r')), program.expression('sqrt(max(r*r - soft2, 0)) / r'));
    return { program, variables: ['r'], parameters, force: [magnitude], radial: magnitude, potential };
  });
}

/**
 * V(Δx) with Δx = x_i − x_j: r (softened) and the spin projections are derived from dx, dy, dz, so
 * the library's gradient carries their direction dependence; F_i = −∇_{Δx} V.
 */
function buildVector(def: ForceDefinition, inR: Expr, names: string[]): Built {
  const length = 'sqrt(dx*dx + dy*dy + dz*dz)';
  const derived: Record<string, string> = { r: `sqrt(dx*dx + dy*dy + dz*dz + soft2)` };
  const needed = new Set(names.filter((name) => !VECTOR_TRIGGERS.has(name)));
  for (const side of ['i', 'j'] as const) {
    if (!names.includes(`s${side}_r`)) continue;
    derived[`s${side}_r`] = `(sx_${side}*dx + sy_${side}*dy + sz_${side}*dz) / ${length}`;
    for (const axis of ['x', 'y', 'z']) needed.add(`s${axis}_${side}`);
  }
  needed.add('soft2');
  const parameters = [...needed];
  return withProgram(def, () => {
    const program = createProgram({ variables: [...RELATIVE_POSITION], parameters, derived, limits: LIMITS });
    const potential = program.expression(librarySource(inR));
    const force = RELATIVE_POSITION.map((v) => program.neg(program.derivative(potential, v)));
    const [fx, fy, fz] = force;
    const [dx, dy, dz] = RELATIVE_POSITION.map((v) => program.expression(v));
    const radial = program.div(program.add(program.add(program.mul(fx!, dx!), program.mul(fy!, dy!)), program.mul(fz!, dz!)), program.expression(length));
    return { program, variables: RELATIVE_POSITION, parameters, force, radial, potential };
  });
}

/** A velocity-dependent central magnitude m applied along r̂ = d / |d|, as three components. */
function radialComponents(magnitude: Expr): Expr[] {
  const d = RELATIVE_POSITION.map((name) => variable(name));
  const length = call('sqrt', d.map((c) => bin('*', c, c)).reduce((a, b) => bin('+', a, b)));
  return d.map((c) => bin('/', bin('*', magnitude, c), length));
}

/**
 * A force-mode vector force, applied as written. Its variables are v_i's components, so the library
 * also gives ∂F/∂v_i when the force reads them (the implicit velocity update needs it).
 */
function buildVectorForce(def: ForceDefinition, components: Expr[], names: string[], jacobian: boolean): Built {
  // r (softened) is an argument of the GLSL function here, so it is a parameter like the others.
  const readsR = components.some((c) => collectVariables(c).has('r'));
  // dx, dy, dz are always declared: the plot's radial part projects the force on them.
  const parameters = [...new Set([...names.filter((name) => !VELOCITY_I.has(name)), ...(readsR ? ['r'] : []), ...RELATIVE_POSITION])];
  return withProgram(def, () => {
    const program = createProgram({ variables: [...VELOCITY_I_COMPONENTS], parameters, limits: LIMITS });
    const force = components.map((c) => program.expression(librarySource(c)));
    const [fx, fy, fz] = force;
    const [dx, dy, dz] = RELATIVE_POSITION.map((v) => program.expression(v));
    const length = program.expression('sqrt(dx*dx + dy*dy + dz*dz)');
    const radial = program.div(program.add(program.add(program.mul(fx!, dx!), program.mul(fy!, dy!)), program.mul(fz!, dz!)), length);
    const columns = jacobian ? VELOCITY_I_COMPONENTS.flatMap((v) => force.map((f) => program.derivative(f, v))) : undefined;
    return { program, variables: VELOCITY_I_COMPONENTS, parameters, force, jacobian: columns, radial, potential: undefined };
  });
}

/** Names the emitted code of `handle` actually uses: a term constant in r drops out of -dV/dr. */
function readNames(program: Program, handles: Handle[], names: readonly string[]): Set<string> {
  const glsl = program.glsl({ name: 'reads', outputs: handles.map((h, k) => ({ name: `o${k}`, type: 'float', components: [h] })) });
  const used = new Set(glsl.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g));
  return new Set(names.filter((name) => used.has(name)));
}

/** The library's emitted JS, wrapped to the scope-in, number-out shape the CPU code uses. */
function jsFunction(program: Program, handle: Handle): CompiledFn {
  const source = program.js({ name: 'f', returns: { type: 'float', components: [handle] } });
  const fn = new Function(`${source}\nreturn f;`)() as (scope: Readonly<Record<string, number>>) => { value: number };
  return (scope) => fn(scope).value;
}

/** The force (and Jacobian) as one JS function: F as a vector, J as rows J[k][l] = ∂F_k/∂v_l. */
function forceJs(program: Program, force: Handle[], jacobian: Handle[] | undefined): (scope: Readonly<Record<string, number>>) => { F: Vec3; J?: [Vec3, Vec3, Vec3] } {
  const outputs = [{ name: 'F', type: 'vec3', components: force }, ...(jacobian ? [{ name: 'J', type: 'mat3', components: jacobian }] : [])];
  const source = program.js({ name: 'f', outputs });
  return new Function(`${source}\nreturn f;`)() as (scope: Readonly<Record<string, number>>) => { F: Vec3; J?: [Vec3, Vec3, Vec3] };
}

/**
 * GLSL from the library with r as the only argument, renamed to our uniforms and pair-variable
 * bindings, then given the full pair signature. pow() becomes spow(): GLSL's pow is undefined for
 * negative bases, while q^n with an odd integer n must behave like Math.pow (the JS side).
 */
function glslFunction(
  program: Program, components: Handle[], jacobian: Handle[] | undefined, variables: readonly string[], name: string, args: string,
  index: number, def: ForceDefinition, names: readonly string[],
): string {
  const params = new Set(def.params.map((p) => p.name));
  const byName = new Map(PAIR_VARIABLES.map((v) => [v.name, v.glsl]));
  const cutoff = forceUniformName(index, 'cutoff');
  const parameters = Object.fromEntries(names.map((n) => {
    if (n === 'cutoff' || n === 'soft2') return [n, forceUniformName(index, n)];
    if (params.has(n)) return [n, forceUniformName(index, n)];
    const glsl = byName.get(n);
    if (glsl === undefined) throw new Error(`no GLSL binding for variable '${n}'`);
    return [n, glsl.replaceAll('CUTOFF', cutoff)];
  }));
  // One variable is passed as float r, three as vec3 p (Δx or v_i); our arguments follow it.
  const variable = variables.length === 1 ? `float ${variables[0]}` : 'vec3 p';
  const type = components.length === 1 ? 'float' : 'vec3';
  const glsl = jacobian
    ? program.glsl({ name, outputs: [{ name: 'F', type: 'vec3', components }, { name: 'J', type: 'mat3', components: jacobian }], parameters })
    : program.glsl({ name, returns: { type, components }, parameters });
  const header = jacobian ? `void ${name}(${variable}, out vec3 F, out mat3 J) {` : `${type} ${name}(${variable}) {`;
  if (!glsl.startsWith(header)) throw new Error(`unexpected shader-autodiff header: ${glsl.split('\n')[0]}`);
  const signature = jacobian ? `void ${name}(${variable}, ${args}, out vec3 F, out mat3 J) {` : `${type} ${name}(${variable}, ${args}) {`;
  return `${signature}${glsl.slice(header.length).replaceAll(/\bpow\(/g, 'spow(')}`;
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
  vx_i: number; vy_i: number; vz_i: number;
  vx_j: number; vy_j: number; vz_j: number;
  time: number;
}

/** The pair's own variables (no r and nothing force-specific): built once per pair, shared by its forces. */
export function pairVariables(pair: Omit<PairScope, 'r'>): Record<string, number> {
  const colorI: Vec3 = [pair.cr_i, pair.cg_i, pair.cb_i];
  const colorJ: Vec3 = [pair.cr_j, pair.cg_j, pair.cb_j];
  const [cx_i, cy_i] = colorPlane(colorI);
  const [cx_j, cy_j] = colorPlane(colorJ);
  return {
    ...pair,
    cx_i, cy_i, cx_j, cy_j,
    c_dot: colorDot(colorI, colorJ),
    q_dot: pair.q_i * pair.q_j + pair.q2_i * pair.q2_j,
    s_dot: pair.sx_i * pair.sx_j + pair.sy_i * pair.sy_j + pair.sz_i * pair.sz_j,
    si_r: pair.sx_i * pair.ux + pair.sy_i * pair.uy + pair.sz_i * pair.uz,
    sj_r: pair.sx_j * pair.ux + pair.sy_j * pair.uy + pair.sz_j * pair.uz,
  };
}

/**
 * Writes one force's names into a pair's `scope`, in place: r softened from the true distance
 * `dist`, the relative position dx, dy, dz (built from `dist`, never the softened r), cutoff,
 * soft2 and the parameters. Names of a previous force may linger; a compiled force reads only its own.
 */
export function setForceVariables(scope: Record<string, number>, force: CompiledForce, dist: number): Record<string, number> {
  const { softening, cutoff, params } = force.definition;
  scope.r = Math.sqrt(dist * dist + softening * softening);
  scope.cutoff = cutoff;
  scope.soft2 = softening * softening;
  scope.dx = scope.ux! * dist;
  scope.dy = scope.uy! * dist;
  scope.dz = scope.uz! * dist;
  for (const param of params) scope[param.name] = param.value;
  return scope;
}

/** Every name `force` may read for one pair at true distance `dist`. */
export function forceScope(force: CompiledForce, pair: Omit<PairScope, 'r'>, dist: number): Record<string, number> {
  return setForceVariables(pairVariables(pair), force, dist);
}

/** The hard cutoff, shared by the CPU references and the plot (the shaders test the same). */
export function acts(force: CompiledForce, dist: number): boolean {
  return force.definition.range !== 'short' || dist < force.definition.cutoff;
}
