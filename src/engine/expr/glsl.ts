import { CONSTANTS, type Expr } from './ast';

const MAX_UNROLLED_POWER = 8;

export function glslFloat(value: number): string {
  if (!Number.isFinite(value)) throw new Error(`cannot emit non-finite constant ${value} to GLSL`);
  const text = String(value);
  return /[.eE]/.test(text) ? text : `${text}.0`;
}

export type Rename = (name: string) => string;

export function toGlsl(expr: Expr, rename: Rename): string {
  switch (expr.kind) {
    case 'num':
      return glslFloat(expr.value);
    case 'var': {
      const constant = CONSTANTS[expr.name];
      return constant !== undefined ? glslFloat(constant) : rename(expr.name);
    }
    case 'neg':
      return `(-${toGlsl(expr.arg, rename)})`;
    case 'bin': {
      const left = toGlsl(expr.left, rename);
      const right = toGlsl(expr.right, rename);
      if (expr.op === '^') return emitPower(left, expr.right, right);
      return `(${left} ${expr.op} ${right})`;
    }
    case 'call':
      return `${expr.fn}(${expr.args.map((arg) => toGlsl(arg, rename)).join(', ')})`;
  }
}

// GLSL pow() is undefined for negative bases, but r^-2, q^3 or (r - r0)^n must behave like Math.pow.
function emitPower(base: string, exponent: Expr, exponentGlsl: string): string {
  if (exponent.kind === 'neg' && exponent.arg.kind === 'num') {
    return emitPower(base, { kind: 'num', value: -exponent.arg.value }, exponentGlsl);
  }
  if (exponent.kind === 'num' && Number.isInteger(exponent.value) && Math.abs(exponent.value) <= MAX_UNROLLED_POWER) {
    const n = exponent.value;
    if (n === 0) return '1.0';
    const positive = `ipow${Math.abs(n)}(${base})`;
    return n > 0 ? positive : `(1.0 / ${positive})`;
  }
  if (exponent.kind === 'num') return `pow(${base}, ${exponentGlsl})`;
  return `spow(${base}, ${exponentGlsl})`;
}

const SIGNED_POW = `float spow(float b, float e) {
  if (b >= 0.0 || fract(e) != 0.0) return pow(b, e);
  float m = pow(-b, e);
  return mod(e, 2.0) == 0.0 ? m : -m;
}`;

export const GLSL_POWER_HELPERS = [
  ...Array.from({ length: MAX_UNROLLED_POWER }, (_, k) => {
    const n = k + 1;
    const body = Array.from({ length: n }, () => 'x').join(' * ');
    return `float ipow${n}(float x) { return ${body}; }`;
  }),
  SIGNED_POW,
].join('\n');
