import { FUNCTION_ARITY, isFunctionName, type BinaryOp, type Expr } from './ast';

export class ExprError extends Error {
  constructor(message: string, readonly position: number) {
    super(`${message} (at column ${position + 1})`);
    this.name = 'ExprError';
  }
}

type Token =
  | { type: 'num'; value: number; pos: number }
  | { type: 'ident'; value: string; pos: number }
  | { type: 'op'; value: string; pos: number }
  | { type: 'end'; pos: number };

const NUMBER = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*/;
const OPERATORS = '+-*/^(),';

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  while (pos < source.length) {
    const rest = source.slice(pos);
    const ch = rest[0]!;
    if (/\s/.test(ch)) {
      pos++;
      continue;
    }
    const numberMatch = NUMBER.exec(rest);
    if (numberMatch) {
      tokens.push({ type: 'num', value: Number(numberMatch[0]), pos });
      pos += numberMatch[0].length;
      continue;
    }
    const identMatch = IDENT.exec(rest);
    if (identMatch) {
      tokens.push({ type: 'ident', value: identMatch[0], pos });
      pos += identMatch[0].length;
      continue;
    }
    if (rest.startsWith('**')) {
      tokens.push({ type: 'op', value: '^', pos });
      pos += 2;
      continue;
    }
    if (OPERATORS.includes(ch)) {
      tokens.push({ type: 'op', value: ch, pos });
      pos++;
      continue;
    }
    throw new ExprError(`unexpected character '${ch}'`, pos);
  }
  tokens.push({ type: 'end', pos });
  return tokens;
}

class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): Expr {
    const expr = this.additive();
    const token = this.peek();
    if (token.type !== 'end') throw new ExprError(`unexpected '${describe(token)}'`, token.pos);
    return expr;
  }

  private peek(): Token {
    return this.tokens[this.index]!;
  }

  private next(): Token {
    return this.tokens[this.index++]!;
  }

  private acceptOp(...ops: string[]): string | undefined {
    const token = this.peek();
    if (token.type === 'op' && ops.includes(token.value)) {
      this.index++;
      return token.value;
    }
    return undefined;
  }

  private expectOp(op: string): void {
    const token = this.next();
    if (token.type !== 'op' || token.value !== op) {
      throw new ExprError(`expected '${op}' but found '${describe(token)}'`, token.pos);
    }
  }

  private additive(): Expr {
    let left = this.multiplicative();
    for (let op = this.acceptOp('+', '-'); op; op = this.acceptOp('+', '-')) {
      left = { kind: 'bin', op: op as BinaryOp, left, right: this.multiplicative() };
    }
    return left;
  }

  private multiplicative(): Expr {
    let left = this.unary();
    for (let op = this.acceptOp('*', '/'); op; op = this.acceptOp('*', '/')) {
      left = { kind: 'bin', op: op as BinaryOp, left, right: this.unary() };
    }
    return left;
  }

  private unary(): Expr {
    const op = this.acceptOp('-', '+');
    if (op === '-') return { kind: 'neg', arg: this.unary() };
    if (op === '+') return this.unary();
    return this.power();
  }

  private power(): Expr {
    const base = this.primary();
    if (this.acceptOp('^')) {
      return { kind: 'bin', op: '^', left: base, right: this.unary() };
    }
    return base;
  }

  private primary(): Expr {
    const token = this.next();
    if (token.type === 'num') return { kind: 'num', value: token.value };
    if (token.type === 'ident') {
      if (this.acceptOp('(')) return this.callArgs(token.value, token.pos);
      return { kind: 'var', name: token.value };
    }
    if (token.type === 'op' && token.value === '(') {
      const inner = this.additive();
      this.expectOp(')');
      return inner;
    }
    throw new ExprError(`unexpected '${describe(token)}'`, token.pos);
  }

  private callArgs(name: string, pos: number): Expr {
    if (!isFunctionName(name)) {
      throw new ExprError(`unknown function '${name}'; available: ${Object.keys(FUNCTION_ARITY).join(', ')}`, pos);
    }
    const args: Expr[] = [];
    if (!this.acceptOp(')')) {
      do args.push(this.additive());
      while (this.acceptOp(','));
      this.expectOp(')');
    }
    const arity = FUNCTION_ARITY[name];
    if (args.length !== arity) {
      throw new ExprError(`function '${name}' takes ${arity} argument(s), got ${args.length}`, pos);
    }
    return { kind: 'call', fn: name, args };
  }
}

function describe(token: Token): string {
  return token.type === 'end' ? 'end of expression' : String(token.value);
}

export function parseExpr(source: string): Expr {
  if (source.trim() === '') throw new ExprError('expression is empty', 0);
  return new Parser(tokenize(source)).parse();
}
