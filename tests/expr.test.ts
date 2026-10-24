import { describe, expect, it } from 'vitest';
import { toInfix } from '../src/engine/expr/ast';
import { evaluate } from '../src/engine/expr/evaluate';
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
