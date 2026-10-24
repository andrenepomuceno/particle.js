import { bin, call, neg, num, type Expr } from './ast';
import { simplify } from './simplify';

const ZERO = num(0);
const ONE = num(1);
const mul = (a: Expr, b: Expr) => bin('*', a, b);
const div = (a: Expr, b: Expr) => bin('/', a, b);
const add = (a: Expr, b: Expr) => bin('+', a, b);
const sub = (a: Expr, b: Expr) => bin('-', a, b);
const sq = (a: Expr) => bin('^', a, num(2));

export function derivative(expr: Expr, wrt: string): Expr {
  return simplify(d(expr, wrt));
}

function dependsOn(expr: Expr, name: string): boolean {
  switch (expr.kind) {
    case 'num': return false;
    case 'var': return expr.name === name;
    case 'neg': return dependsOn(expr.arg, name);
    case 'bin': return dependsOn(expr.left, name) || dependsOn(expr.right, name);
    case 'call': return expr.args.some((arg) => dependsOn(arg, name));
  }
}

function d(expr: Expr, x: string): Expr {
  if (!dependsOn(expr, x)) return ZERO;
  switch (expr.kind) {
    case 'num': return ZERO;
    case 'var': return ONE;
    case 'neg': return neg(d(expr.arg, x));
    case 'bin': return dBinary(expr.op, expr.left, expr.right, x);
    case 'call': return dCall(expr, x);
  }
}

function dBinary(op: '+' | '-' | '*' | '/' | '^', u: Expr, v: Expr, x: string): Expr {
  switch (op) {
    case '+': return add(d(u, x), d(v, x));
    case '-': return sub(d(u, x), d(v, x));
    case '*': return add(mul(d(u, x), v), mul(u, d(v, x)));
    case '/': return div(sub(mul(d(u, x), v), mul(u, d(v, x))), sq(v));
    case '^':
      if (!dependsOn(v, x)) return mul(mul(v, bin('^', u, sub(v, ONE))), d(u, x));
      return mul(bin('^', u, v), add(mul(d(v, x), call('log', u)), div(mul(v, d(u, x)), u)));
  }
}

function dCall(expr: Extract<Expr, { kind: 'call' }>, x: string): Expr {
  const [u, v, w] = expr.args as [Expr, Expr, Expr];
  const du = d(u, x);
  switch (expr.fn) {
    case 'sin': return mul(call('cos', u), du);
    case 'cos': return neg(mul(call('sin', u), du));
    case 'tan': return div(du, sq(call('cos', u)));
    case 'asin': return div(du, call('sqrt', sub(ONE, sq(u))));
    case 'acos': return neg(div(du, call('sqrt', sub(ONE, sq(u)))));
    case 'atan': return div(du, add(ONE, sq(u)));
    case 'sinh': return mul(call('cosh', u), du);
    case 'cosh': return mul(call('sinh', u), du);
    case 'tanh': return mul(sub(ONE, sq(call('tanh', u))), du);
    case 'exp': return mul(call('exp', u), du);
    case 'log': return div(du, u);
    case 'sqrt': return div(du, mul(num(2), call('sqrt', u)));
    case 'abs': return mul(call('sign', u), du);
    case 'sign':
    case 'floor':
    case 'step':
      return ZERO;
    case 'pow': return dBinary('^', u, v, x);
    case 'min': return add(mul(call('step', u, v), d(u, x)), mul(sub(ONE, call('step', u, v)), d(v, x)));
    case 'max': return add(mul(call('step', v, u), d(u, x)), mul(sub(ONE, call('step', v, u)), d(v, x)));
    case 'clamp': return mul(mul(call('step', v, u), call('step', u, w)), du);
  }
}
