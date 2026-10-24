import type { Vec3 } from './particles';

export class JsonPathError extends Error {
  constructor(readonly source: string, readonly path: string, message: string) {
    super(`invalid ${source} at '${path}': ${message}`);
    this.name = 'JsonPathError';
  }
}

/** Typed readers that fail with the JSON path of the offending value. */
export class JsonReader {
  constructor(readonly source: string) {}

  fail(path: string, message: string): never {
    throw new JsonPathError(this.source, path, message);
  }

  parse(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch (error) {
      return this.fail('$', `not valid JSON (${(error as Error).message})`);
    }
  }

  object(value: unknown, path: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) this.fail(path, 'expected an object');
    return value as Record<string, unknown>;
  }

  array(value: unknown, path: string): unknown[] {
    if (!Array.isArray(value)) this.fail(path, 'expected an array');
    return value;
  }

  finite(value: unknown, path: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) this.fail(path, `expected a finite number, got ${JSON.stringify(value)}`);
    return value;
  }

  string(value: unknown, path: string): string {
    if (typeof value !== 'string') this.fail(path, `expected a string, got ${JSON.stringify(value)}`);
    return value;
  }

  boolean(value: unknown, path: string): boolean {
    if (typeof value !== 'boolean') this.fail(path, `expected true or false, got ${JSON.stringify(value)}`);
    return value;
  }

  oneOf<T extends string | number | boolean>(value: unknown, options: readonly T[], path: string): T {
    if (!options.includes(value as T)) this.fail(path, `expected one of ${options.join(', ')}, got ${JSON.stringify(value)}`);
    return value as T;
  }

  vec3(value: unknown, path: string): Vec3 {
    const items = this.array(value, path);
    if (items.length !== 3) this.fail(path, `expected 3 components, got ${items.length}`);
    return [this.finite(items[0], `${path}[0]`), this.finite(items[1], `${path}[1]`), this.finite(items[2], `${path}[2]`)];
  }

  /** Rejects keys the format does not know, so a typo cannot silently fall back to a default. */
  onlyKeys(o: Record<string, unknown>, allowed: readonly string[], path: string): void {
    const unknown = Object.keys(o).filter((key) => !allowed.includes(key));
    if (unknown.length > 0) this.fail(path, `unknown key(s) ${unknown.join(', ')}; allowed: ${allowed.join(', ')}`);
  }

  optional<T>(o: Record<string, unknown>, key: string, read: (value: unknown) => T): T | undefined {
    return o[key] === undefined ? undefined : read(o[key]);
  }
}
