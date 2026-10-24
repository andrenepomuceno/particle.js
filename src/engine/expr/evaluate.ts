import { CONSTANTS, type Expr, type FunctionName } from './ast';

export type Scope = Readonly<Record<string, number>>;
export type CompiledFn = (scope: Scope) => number;

const FUNCTIONS: Record<FunctionName, (...args: number[]) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  exp: Math.exp, log: Math.log, sqrt: Math.sqrt,
  abs: Math.abs, sign: Math.sign, floor: Math.floor,
  min: Math.min, max: Math.max, pow: Math.pow,
  step: (edge, x) => (x < edge ? 0 : 1),
  clamp: (x, lo, hi) => Math.min(Math.max(x, lo), hi),
};

export function compileJs(expr: Expr): CompiledFn {
  switch (expr.kind) {
    case 'num': {
      const value = expr.value;
      return () => value;
    }
    case 'var': {
      const name = expr.name;
      const constant = CONSTANTS[name];
      if (constant !== undefined) return () => constant;
      return (scope) => {
        const value = scope[name];
        if (value === undefined) throw new Error(`variable '${name}' has no value in scope`);
        return value;
      };
    }
    case 'neg': {
      const arg = compileJs(expr.arg);
      return (scope) => -arg(scope);
    }
    case 'bin': {
      const left = compileJs(expr.left);
      const right = compileJs(expr.right);
      switch (expr.op) {
        case '+': return (scope) => left(scope) + right(scope);
        case '-': return (scope) => left(scope) - right(scope);
        case '*': return (scope) => left(scope) * right(scope);
        case '/': return (scope) => left(scope) / right(scope);
        case '^': return (scope) => Math.pow(left(scope), right(scope));
      }
      break;
    }
    case 'call': {
      const fn = FUNCTIONS[expr.fn];
      const args = expr.args.map(compileJs);
      return (scope) => fn(...args.map((arg) => arg(scope)));
    }
  }
}

export function evaluate(expr: Expr, scope: Scope): number {
  return compileJs(expr)(scope);
}
