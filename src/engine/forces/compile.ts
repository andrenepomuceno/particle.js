import { CONSTANTS, FUNCTION_ARITY, bin, collectVariables, neg, variable, type Expr } from '../expr/ast';
import { derivative } from '../expr/derivative';
import { colorDot, colorPlane } from '../colorCharge';
import { compileJs, type CompiledFn } from '../expr/evaluate';
import type { Vec3 } from '../particles';
import { toGlsl } from '../expr/glsl';
import { ExprError, parseExpr } from '../expr/parser';
import { simplify } from '../expr/simplify';
import type { ForceDefinition } from './types';
import { PAIR_VARIABLES, PAIR_VARIABLE_NAMES } from './variables';

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
// 'soft2' and 'cutoff' become uniforms uF<k>_<name>; '__' is reserved in GLSL, so names may not start with '_'.
const RESERVED = new Set([...PAIR_VARIABLE_NAMES, ...Object.keys(CONSTANTS), ...Object.keys(FUNCTION_ARITY), 'soft2', 'cutoff']);

export interface CompiledForce {
  definition: ForceDefinition;
  /** Signed force magnitude as a function of r; positive pushes the pair apart. */
  magnitude: Expr;
  evaluate: CompiledFn;
  /** V(r) for potential-mode forces; force-mode expressions have no known potential. */
  potential: Expr | undefined;
  evaluatePotential: CompiledFn | undefined;
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
    seen.add(param.name);
    if (!Number.isFinite(param.value)) problems.push(`parameter '${param.name}' must be finite, got ${param.value}`);
  }
  return problems;
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

  const inR = substitute(parsed, 'x', bin('/', variable('r'), variable('cutoff')));
  const magnitude = def.mode === 'potential' ? simplify(neg(derivative(inR, 'r'))) : simplify(inR);
  const potential = def.mode === 'potential' ? simplify(inR) : undefined;
  const nonFinite = [...nonFiniteConstants(magnitude), ...(potential ? nonFiniteConstants(potential) : [])];
  if (nonFinite.length > 0) {
    throw new ForceValidationError(def.name, [`expression folds to a non-finite constant (${nonFinite.join(', ')}); check divisions by zero and log/sqrt of non-positive numbers`]);
  }
  return {
    definition: def, magnitude, evaluate: compileJs(magnitude),
    potential, evaluatePotential: potential && compileJs(potential),
  };
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

function nonFiniteConstants(expr: Expr, found: number[] = []): number[] {
  switch (expr.kind) {
    case 'num':
      if (!Number.isFinite(expr.value)) found.push(expr.value);
      break;
    case 'var':
      break;
    case 'neg':
      nonFiniteConstants(expr.arg, found);
      break;
    case 'bin':
      nonFiniteConstants(expr.left, found);
      nonFiniteConstants(expr.right, found);
      break;
    case 'call':
      expr.args.forEach((arg) => nonFiniteConstants(arg, found));
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

export function forceToGlsl(force: CompiledForce, forceIndex: number, expr: Expr = force.magnitude): string {
  const params = new Set(force.definition.params.map((p) => p.name));
  const byName = new Map(PAIR_VARIABLES.map((v) => [v.name, v.glsl]));
  const cutoff = forceUniformName(forceIndex, 'cutoff');
  return toGlsl(expr, (name) => {
    if (params.has(name)) return forceUniformName(forceIndex, name);
    const glsl = byName.get(name);
    if (glsl === undefined) throw new Error(`no GLSL binding for variable '${name}'`);
    return glsl.replaceAll('CUTOFF', cutoff);
  });
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
