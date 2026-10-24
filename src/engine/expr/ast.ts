export type BinaryOp = '+' | '-' | '*' | '/' | '^';

export type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'neg'; arg: Expr }
  | { kind: 'bin'; op: BinaryOp; left: Expr; right: Expr }
  | { kind: 'call'; fn: FunctionName | VectorFunctionName; args: Expr[] };

export const FUNCTION_ARITY = {
  sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1,
  sinh: 1, cosh: 1, tanh: 1,
  exp: 1, log: 1, sqrt: 1, abs: 1, sign: 1, floor: 1,
  min: 2, max: 2, pow: 2, step: 2,
  clamp: 3,
} as const;

export type FunctionName = keyof typeof FUNCTION_ARITY;

/** Functions that take or return vectors; lowerVectors (vector.ts) removes them before any backend. */
export const VECTOR_FUNCTIONS = { cross: 2, dot: 2, vec: 3, length: 1, normalize: 1 } as const;
export type VectorFunctionName = keyof typeof VECTOR_FUNCTIONS;

export function isVectorFunction(name: string): name is VectorFunctionName {
  return Object.hasOwn(VECTOR_FUNCTIONS, name);
}

export function isFunctionName(name: string): name is FunctionName {
  return Object.hasOwn(FUNCTION_ARITY, name);
}

export const CONSTANTS: Readonly<Record<string, number>> = { pi: Math.PI, e: Math.E };

export const num = (value: number): Expr => ({ kind: 'num', value });
export const variable = (name: string): Expr => ({ kind: 'var', name });
export const neg = (arg: Expr): Expr => ({ kind: 'neg', arg });
export const bin = (op: BinaryOp, left: Expr, right: Expr): Expr => ({ kind: 'bin', op, left, right });
export const call = (fn: FunctionName | VectorFunctionName, ...args: Expr[]): Expr => ({ kind: 'call', fn, args });

export function collectVariables(expr: Expr, into = new Set<string>()): Set<string> {
  switch (expr.kind) {
    case 'num':
      break;
    case 'var':
      into.add(expr.name);
      break;
    case 'neg':
      collectVariables(expr.arg, into);
      break;
    case 'bin':
      collectVariables(expr.left, into);
      collectVariables(expr.right, into);
      break;
    case 'call':
      expr.args.forEach((arg) => collectVariables(arg, into));
      break;
  }
  return into;
}

export function toInfix(expr: Expr): string {
  switch (expr.kind) {
    // Parenthesised when negative: in -2^n the power binds first, unlike (-2)^n.
    case 'num':
      return expr.value < 0 ? `(${expr.value})` : String(expr.value);
    case 'var':
      return expr.name;
    case 'neg':
      return `(-${toInfix(expr.arg)})`;
    case 'bin':
      return `(${toInfix(expr.left)} ${expr.op} ${toInfix(expr.right)})`;
    case 'call':
      return `${expr.fn}(${expr.args.map(toInfix).join(', ')})`;
  }
}
