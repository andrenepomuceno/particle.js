import { bin, neg, num, type BinaryOp, type Expr } from './ast';
import { evaluate } from './evaluate';

const isNum = (expr: Expr, value?: number): expr is { kind: 'num'; value: number } =>
  expr.kind === 'num' && (value === undefined || expr.value === value);

export function simplify(expr: Expr): Expr {
  switch (expr.kind) {
    case 'num':
    case 'var':
      return expr;
    case 'neg': {
      const arg = simplify(expr.arg);
      if (isNum(arg)) return num(-arg.value);
      if (arg.kind === 'neg') return arg.arg;
      return neg(arg);
    }
    case 'call': {
      const args = expr.args.map(simplify);
      const folded = { ...expr, args };
      return args.every((arg) => isNum(arg)) ? num(evaluate(folded, {})) : folded;
    }
    case 'bin':
      return simplifyBinary(expr.op, simplify(expr.left), simplify(expr.right));
  }
}

function simplifyBinary(op: BinaryOp, left: Expr, right: Expr): Expr {
  if (isNum(left) && isNum(right)) return num(evaluate(bin(op, left, right), {}));
  switch (op) {
    case '+':
      if (isNum(left, 0)) return right;
      if (isNum(right, 0)) return left;
      if (right.kind === 'neg') return simplifyBinary('-', left, right.arg);
      break;
    case '-':
      if (isNum(right, 0)) return left;
      if (isNum(left, 0)) return simplify(neg(right));
      if (right.kind === 'neg') return simplifyBinary('+', left, right.arg);
      break;
    case '*':
      if (isNum(left, 0) || isNum(right, 0)) return num(0);
      if (isNum(left, 1)) return right;
      if (isNum(right, 1)) return left;
      if (isNum(left, -1)) return simplify(neg(right));
      if (isNum(right, -1)) return simplify(neg(left));
      if (left.kind === 'neg') return simplify(neg(simplifyBinary('*', left.arg, right)));
      if (right.kind === 'neg') return simplify(neg(simplifyBinary('*', left, right.arg)));
      break;
    case '/':
      if (isNum(left, 0)) return num(0);
      if (isNum(right, 1)) return left;
      if (left.kind === 'neg') return simplify(neg(simplifyBinary('/', left.arg, right)));
      break;
    case '^':
      if (isNum(right, 0)) return num(1);
      if (isNum(right, 1)) return left;
      break;
  }
  return bin(op, left, right);
}
