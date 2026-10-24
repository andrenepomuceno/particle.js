import { describe, expect, it } from 'vitest';
import { toInfix } from '../src/engine/expr/ast';
import { derivative } from '../src/engine/expr/derivative';
import { evaluate } from '../src/engine/expr/evaluate';
import { GLSL_POWER_HELPERS, glslFloat, toGlsl } from '../src/engine/expr/glsl';
import { ExprError, parseExpr } from '../src/engine/expr/parser';
import { simplify } from '../src/engine/expr/simplify';

const evalStr = (source: string, scope: Record<string, number> = {}) => evaluate(parseExpr(source), scope);

describe('parseExpr', () => {
  it.each([
    ['1 + 2 * 3', 7],
    ['(1 + 2) * 3', 9],
    ['2 ^ 3 ^ 2', 512],
    ['2 ** 3', 8],
    ['-2 ^ 2', -4],
    ['2 ^ -1', 0.5],
    ['10 / 4 / 5', 0.5],
    ['1.5e2 + .5', 150.5],
    ['+3 - -2', 5],
    ['max(1, min(5, 3))', 3],
    ['clamp(7, 0, 2)', 2],
    ['step(1, 0.5) + step(1, 1)', 1],
    ['pi', Math.PI],
    ['e', Math.E],
  ])('evaluates %s', (source, expected) => {
    expect(evalStr(source)).toBeCloseTo(expected, 12);
  });

  it('reads variables from scope', () => {
    expect(evalStr('k * q_i * q_j / r^2', { k: 2, q_i: 3, q_j: -1, r: 2 })).toBe(-1.5);
  });

  it.each([
    ['', /empty/],
    ['1 +', /unexpected 'end of expression'/],
    ['(1 + 2', /expected '\)'/],
    ['1 $ 2', /unexpected character '\$'/],
    ['foo(1)', /unknown function 'foo'/],
    ['sin(1, 2)', /takes 1 argument\(s\), got 2/],
    ['1 2', /unexpected '2'/],
  ])('rejects %j', (source, message) => {
    expect(() => parseExpr(source)).toThrow(ExprError);
    expect(() => parseExpr(source)).toThrow(message);
  });

  it('reports the failing column', () => {
    expect(() => parseExpr('1 + )')).toThrow(/column 5/);
  });

  it('fails loudly on a missing variable', () => {
    expect(() => evalStr('a + 1')).toThrow(/variable 'a' has no value/);
  });
});

describe('simplify', () => {
  it.each([
    ['0 + x', 'x'],
    ['x * 1', 'x'],
    ['x * 0', '0'],
    ['x ^ 1', 'x'],
    ['x ^ 0', '1'],
    ['--x', 'x'],
    ['2 * 3 + x', '(6 + x)'],
    ['x - -y', '(x + y)'],
    ['x + -y', '(x - y)'],
    ['-1 * x', '(-x)'],
    ['0 - x', '(-x)'],
    ['sqrt(4) * x', '(2 * x)'],
    ['-x * y', '(-(x * y))'],
    ['-x / y', '(-(x / y))'],
  ])('%s -> %s', (source, expected) => {
    expect(toInfix(simplify(parseExpr(source)))).toBe(expected);
  });
});

describe('derivative', () => {
  const cases: [string, (r: number) => number][] = [
    ['r^2', (r) => 2 * r],
    ['1 / r', (r) => -1 / r ** 2],
    ['r^-2', (r) => -2 / r ** 3],
    ['exp(-r / 2) / r', (r) => -Math.exp(-r / 2) / (2 * r) - Math.exp(-r / 2) / r ** 2],
    ['sin(r) * cos(r)', (r) => Math.cos(2 * r)],
    ['tan(r) + atan(r)', (r) => 1 / Math.cos(r) ** 2 + 1 / (1 + r * r)],
    ['asin(r / 4) + acos(r / 4)', () => 0],
    ['sinh(r) + cosh(r)', (r) => Math.cosh(r) + Math.sinh(r)],
    ['tanh(r)', (r) => 1 - Math.tanh(r) ** 2],
    ['log(r) + sqrt(r)', (r) => 1 / r + 0.5 / Math.sqrt(r)],
    ['abs(r - 2)', (r) => Math.sign(r - 2)],
    ['r ^ r', (r) => r ** r * (Math.log(r) + 1)],
    ['pow(r, 3)', (r) => 3 * r * r],
    ['min(r, 1) + max(r, 1)', () => 1],
    ['clamp(r, 0, 2)', (r) => (r <= 2 ? 1 : 0)],
    ['sign(r) + floor(r) + step(1, r) + 7', () => 0],
    ['4 * k * ((s / r)^12 - (s / r)^6)', (r) => 4 * 3 * (-12 * 2 ** 12 / r ** 13 + 6 * 2 ** 6 / r ** 7)],
  ];

  it.each(cases)('d/dr %s', (source, expected) => {
    const dExpr = derivative(parseExpr(source), 'r');
    for (const r of [0.7, 1.3, 2.9]) {
      const want = expected(r);
      expect(Math.abs(evaluate(dExpr, { r, k: 3, s: 2 }) - want)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(want)));
    }
  });

  it('treats other variables as constants', () => {
    expect(toInfix(derivative(parseExpr('q_i * q_j'), 'r'))).toBe('0');
  });
});

describe('toGlsl', () => {
  const glsl = (source: string) => toGlsl(parseExpr(source), (name) => `u_${name}`);

  it('emits float literals', () => {
    expect(glsl('1 + 2.5 + 1e-7')).toBe('((1.0 + 2.5) + 1e-7)');
    expect(glslFloat(3)).toBe('3.0');
  });

  it('unrolls integer powers so negative bases stay defined', () => {
    expect(glsl('q^2')).toBe('ipow2(u_q)');
    expect(glsl('r^-3')).toBe('(1.0 / ipow3(u_r))');
    expect(glsl('r^0')).toBe('1.0');
    expect(glsl('r^0.5')).toBe('pow(u_r, 0.5)');
    expect(glsl('r^20')).toBe('pow(u_r, 20.0)');
    expect(glsl('(r - a)^n')).toBe('spow((u_r - u_a), u_n)');
    expect(GLSL_POWER_HELPERS).toContain('float spow(float b, float e)');
    expect(GLSL_POWER_HELPERS).toContain('float ipow3(float x) { return x * x * x; }');
  });

  it('renames variables and inlines constants', () => {
    expect(glsl('-k * sin(pi * r)')).toBe(`((-u_k) * sin((${Math.PI} * u_r)))`);
  });

  it('refuses non-finite constants', () => {
    expect(() => glslFloat(Infinity)).toThrow(/non-finite/);
  });
});
