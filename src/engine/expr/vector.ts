import { bin, call, isVectorFunction, neg, variable, type Expr } from './ast';

/** Vector-valued names and the scalar variables their components lower to. */
export const VECTOR_VARIABLES: Readonly<Record<string, readonly [string, string, string]>> = {
  v_i: ['vx_i', 'vy_i', 'vz_i'],
  v_j: ['vx_j', 'vy_j', 'vz_j'],
  s_i: ['sx_i', 'sy_i', 'sz_i'],
  s_j: ['sx_j', 'sy_j', 'sz_j'],
  d: ['dx', 'dy', 'dz'],
};

export type Vector = readonly [Expr, Expr, Expr];

/** Scalar shorthands written in vector terms, so their velocity dependence reaches ∂F/∂v_i. */
const SHORTHANDS: Readonly<Record<string, () => Expr>> = {
  v_dot: () => call('dot', bin('-', variable('v_i'), variable('v_j')), variable('rhat')),
  v_rel: () => call('length', bin('-', variable('v_i'), variable('v_j'))),
  vv_dot: () => call('dot', variable('v_i'), variable('v_j')),
};
export type Lowered = { kind: 'scalar'; expr: Expr } | { kind: 'vector'; components: Vector };

export class VectorTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VectorTypeError';
  }
}

const scalar = (expr: Expr): Lowered => ({ kind: 'scalar', expr });
const vector = (components: Vector): Lowered => ({ kind: 'vector', components });
const map = (v: Vector, f: (e: Expr) => Expr): Vector => [f(v[0]), f(v[1]), f(v[2])];
const zip = (a: Vector, b: Vector, f: (x: Expr, y: Expr) => Expr): Vector => [f(a[0], b[0]), f(a[1], b[1]), f(a[2], b[2])];
const dotOf = (a: Vector, b: Vector): Expr => bin('+', bin('+', bin('*', a[0], b[0]), bin('*', a[1], b[1])), bin('*', a[2], b[2]));
const lengthOf = (a: Vector): Expr => call('sqrt', dotOf(a, a));

function describe(l: Lowered): string {
  return l.kind === 'scalar' ? 'a number' : 'a vector';
}

/**
 * Type-checks an expression mixing numbers and vectors and lowers it to scalar expressions: a
 * number, or three components. `rhat` is d / |d|. Only meaningful combinations are allowed
 * (vector ± vector, number × vector, vector / number, cross, dot, vec, length, normalize).
 */
export function lowerVectors(expr: Expr): Lowered {
  switch (expr.kind) {
    case 'num':
      return scalar(expr);
    case 'var': {
      const shorthand = SHORTHANDS[expr.name];
      if (shorthand) return lowerVectors(shorthand());
      if (expr.name === 'rhat') {
        const d = VECTOR_VARIABLES.d!.map((name) => variable(name)) as unknown as Vector;
        return vector(map(d, (c) => bin('/', c, lengthOf(d))));
      }
      const components = VECTOR_VARIABLES[expr.name];
      return components ? vector(components.map((name) => variable(name)) as unknown as Vector) : scalar(expr);
    }
    case 'neg': {
      const arg = lowerVectors(expr.arg);
      return arg.kind === 'scalar' ? scalar(neg(arg.expr)) : vector(map(arg.components, neg));
    }
    case 'bin': {
      const left = lowerVectors(expr.left);
      const right = lowerVectors(expr.right);
      if (left.kind === 'scalar' && right.kind === 'scalar') return scalar(bin(expr.op, left.expr, right.expr));
      switch (expr.op) {
        case '+':
        case '-':
          if (left.kind === 'vector' && right.kind === 'vector') return vector(zip(left.components, right.components, (a, b) => bin(expr.op, a, b)));
          throw new VectorTypeError(`cannot ${expr.op === '+' ? 'add' : 'subtract'} ${describe(left)} and ${describe(right)}`);
        case '*':
          if (left.kind === 'scalar' && right.kind === 'vector') return vector(map(right.components, (c) => bin('*', left.expr, c)));
          if (left.kind === 'vector' && right.kind === 'scalar') return vector(map(left.components, (c) => bin('*', c, right.expr)));
          throw new VectorTypeError('cannot multiply two vectors with *; use dot(a, b) or cross(a, b)');
        case '/':
          if (left.kind === 'vector' && right.kind === 'scalar') return vector(map(left.components, (c) => bin('/', c, right.expr)));
          throw new VectorTypeError('cannot divide by a vector');
        case '^':
          throw new VectorTypeError('cannot raise a vector to a power; use dot(a, a) or length(a)');
      }
      break;
    }
    case 'call': {
      const args = expr.args.map(lowerVectors);
      const fn: string = expr.fn;
      if (!isVectorFunction(fn)) {
        const bad = args.find((a) => a.kind === 'vector');
        if (bad) throw new VectorTypeError(`${fn}() takes numbers, got a vector`);
        return scalar(call(expr.fn, ...args.map((a) => (a as { expr: Expr }).expr)));
      }
      const vectors = () => args.map((a) => {
        if (a.kind !== 'vector') throw new VectorTypeError(`${fn}() takes vectors, got a number`);
        return a.components;
      });
      switch (fn) {
        case 'cross': {
          const [a, b] = vectors() as [Vector, Vector];
          return vector([
            bin('-', bin('*', a[1], b[2]), bin('*', a[2], b[1])),
            bin('-', bin('*', a[2], b[0]), bin('*', a[0], b[2])),
            bin('-', bin('*', a[0], b[1]), bin('*', a[1], b[0])),
          ]);
        }
        case 'dot': {
          const [a, b] = vectors() as [Vector, Vector];
          return scalar(dotOf(a, b));
        }
        case 'length':
          return scalar(lengthOf(vectors()[0]!));
        case 'normalize': {
          const a = vectors()[0]!;
          return vector(map(a, (c) => bin('/', c, lengthOf(a))));
        }
        case 'vec': {
          const bad = args.find((a) => a.kind === 'vector');
          if (bad) throw new VectorTypeError('vec() takes three numbers, got a vector');
          return vector(args.map((a) => (a as { expr: Expr }).expr) as unknown as Vector);
        }
      }
    }
  }
  throw new VectorTypeError(`unsupported expression ${JSON.stringify(expr)}`);
}
