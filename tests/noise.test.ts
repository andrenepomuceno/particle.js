import { describe, expect, it } from 'vitest';
import {
  float32Bits, GLSL_NOISE_HELPERS, hashNormal, hashUniform, MEAN_NOISE, NOISE_STREAMS, pairNoise, pairSeed, pcgHash, type PairNoise,
} from '../src/engine/noise';

const M32 = 0xffffffffn;

/** pcg_hash as printed in Jarzynski & Olano (2020), in BigInt: an independent check of the Math.imul version. */
function pcgReference(x: bigint): bigint {
  const state = (x * 747796405n + 2891336453n) & M32;
  const word = (((state >> ((state >> 28n) + 4n)) ^ state) * 277803737n) & M32;
  return ((word >> 22n) ^ word) & M32;
}

type GlslFn = (...args: (bigint | number)[]) => bigint | number;

/**
 * Runs GLSL_NOISE_HELPERS as JS: uint values become BigInt, wrapped mod 2³² at every assignment and
 * uint return (the helpers assign every wrapped value before shifting it), floats stay numbers.
 */
function glslHelpers(): Record<string, GlslFn> {
  const expression = (glsl: string) => glsl
    .replace(/\b(\d+)u\b/g, '$1n')
    .replace(/\bfloat\(/g, 'Number(')
    .replace(/\b(sqrt|log|cos)\(/g, 'Math.$1(');
  let returnsUint = false;
  const names: string[] = [];
  const body = GLSL_NOISE_HELPERS.trim().split('\n').map((line) => {
    const header = /^(uint|float) (\w+)\((.*)\) \{$/.exec(line);
    if (header) {
      returnsUint = header[1] === 'uint';
      names.push(header[2]!);
      return `function ${header[2]}(${header[3]!.replace(/\b(uint|float) /g, '')}) {`;
    }
    const assignment = /^(\s*)(uint|float) (\w+) = (.*);$/.exec(line);
    if (assignment) {
      const value = expression(assignment[4]!);
      return `${assignment[1]}const ${assignment[3]} = ${assignment[2] === 'uint' ? `BigInt.asUintN(32, ${value})` : value};`;
    }
    const result = /^(\s*)return (.*);$/.exec(line);
    if (result) return `${result[1]}return ${returnsUint ? `BigInt.asUintN(32, ${expression(result[2]!)})` : expression(result[2]!)};`;
    if (line.trim() === '}') return line;
    throw new Error(`unexpected GLSL line: ${line}`);
  }).join('\n');
  return new Function(`${body}\nreturn { ${names.join(', ')} };`)() as Record<string, GlslFn>;
}

describe('pair noise hash', () => {
  it('matches the reference pcg_hash on edge and scattered inputs', () => {
    const inputs = [0, 1, 2, 0x7fffffff, 0x80000000, 0xffffffff, ...Array.from({ length: 2000 }, (_, k) => (k * 2654435761) >>> 0)];
    for (const x of inputs) expect(pcgHash(x)).toBe(Number(pcgReference(BigInt(x))));
  });

  it('reads the float32 bit pattern of the time', () => {
    expect(float32Bits(0)).toBe(0);
    expect(float32Bits(1)).toBe(0x3f800000);
    expect(float32Bits(-2)).toBe(0xc0000000);
    expect(float32Bits(0.1)).toBe(0x3dcccccd);
    // The GPU only sees the float32 time, so times that round to it give the same numbers.
    expect(pairNoise(3, 8, 0.1)).toEqual(pairNoise(3, 8, Math.fround(0.1)));
  });

  it('is deterministic, symmetric in i and j, and changes with the time and the pair', () => {
    expect(pairNoise(3, 8, 1.25)).toEqual(pairNoise(3, 8, 1.25));
    expect(pairNoise(8, 3, 1.25)).toEqual(pairNoise(3, 8, 1.25));
    expect(pairNoise(3, 8, 1.29).randn).not.toBe(pairNoise(3, 8, 1.25).randn);
    expect(pairNoise(3, 9, 1.25).randn).not.toBe(pairNoise(3, 8, 1.25).randn);
  });

  it('draws each value from its own stream', () => {
    const seed = pairSeed(5, 2, 7.5);
    const noise = pairNoise(5, 2, 7.5);
    for (const [name, { stream, normal }] of Object.entries(NOISE_STREAMS)) {
      expect(noise[name as keyof PairNoise]).toBe(normal ? hashNormal(seed, stream) : hashUniform(seed, stream));
    }
    // A normal takes two streams; none may overlap.
    const used = Object.values(NOISE_STREAMS).flatMap(({ stream, normal }) => (normal ? [stream, stream + 1] : [stream]));
    expect(new Set(used).size).toBe(used.length);
  });

  it('rejects indices that are not integers >= 0', () => {
    expect(() => pairSeed(-1, 2, 0)).toThrow(/pair indices must be integers >= 0, got -1 and 2/);
    expect(() => pairSeed(1, 2.5, 0)).toThrow(/got 1 and 2.5/);
  });

  it('gives uniforms in [0, 1) on the 2⁻²⁴ grid with mean ½ and variance 1/12', () => {
    const samples: number[] = [];
    for (let step = 0; step < 50; step++) {
      for (let i = 0; i < 40; i++) for (let j = i + 1; j < 40; j++) samples.push(pairNoise(i, j, step * 0.04).rand);
    }
    expect(samples.every((u) => u >= 0 && u < 1 && Number.isInteger(u * 2 ** 24))).toBe(true);
    const mean = samples.reduce((s, u) => s + u, 0) / samples.length;
    const variance = samples.reduce((s, u) => s + (u - mean) ** 2, 0) / samples.length;
    expect(Math.abs(mean - 0.5)).toBeLessThan(0.005);
    expect(Math.abs(variance - 1 / 12)).toBeLessThan(0.002);
  });

  it('gives independent standard normals for randn and randv', () => {
    const samples: PairNoise[] = [];
    for (let step = 0; step < 50; step++) {
      for (let i = 0; i < 40; i++) for (let j = i + 1; j < 40; j++) samples.push(pairNoise(i, j, 3 + step * 0.04));
    }
    const names = ['randn', 'randvx', 'randvy', 'randvz'] as const;
    const mean = (name: (typeof names)[number]) => samples.reduce((s, n) => s + n[name], 0) / samples.length;
    for (const name of names) {
      const variance = samples.reduce((s, n) => s + n[name] ** 2, 0) / samples.length;
      expect(Math.abs(mean(name))).toBeLessThan(0.02);
      expect(Math.abs(variance - 1)).toBeLessThan(0.03);
      // 1 − u ≥ 2⁻²⁴ inside the log bounds every normal by √(48 ln 2).
      expect(samples.every((n) => Number.isFinite(n[name]) && Math.abs(n[name]) <= Math.sqrt(48 * Math.LN2))).toBe(true);
    }
    names.forEach((a, k) => names.slice(k + 1).forEach((b) => {
      const correlation = samples.reduce((s, n) => s + n[a] * n[b], 0) / samples.length;
      expect(Math.abs(correlation)).toBeLessThan(0.02);
    }));
    // The same pair at consecutive steps is uncorrelated too.
    let lag = 0;
    let count = 0;
    for (let i = 0; i < 40; i++) {
      for (let step = 0; step < 50; step++) {
        lag += pairNoise(i, i + 1, step * 0.04).randn * pairNoise(i, i + 1, (step + 1) * 0.04).randn;
        count++;
      }
    }
    expect(Math.abs(lag / count)).toBeLessThan(0.08);
  });

  it('keeps probe and plot values at the mean', () => {
    expect(MEAN_NOISE).toEqual({ rand: 0.5, randn: 0, randvx: 0, randvy: 0, randvz: 0 });
  });
});

describe('GLSL noise helpers', () => {
  const glsl = glslHelpers();

  it('compute the same uint32 hash and seed as the JS reference', () => {
    for (let k = 0; k < 2000; k++) {
      const x = (k * 2246822519 + 7) >>> 0;
      expect(glsl.pcgHash!(BigInt(x))).toBe(BigInt(pcgHash(x)));
      const [i, j, time] = [k % 97, (k * 31) % 1013, k * 0.0371];
      const seed = glsl.pairSeed!(BigInt(Math.min(i, j)), BigInt(Math.max(i, j)), BigInt(float32Bits(time)));
      expect(seed).toBe(BigInt(pairSeed(i, j, time)));
    }
  });

  it('compute the same uniforms and normals as the JS reference', () => {
    for (let k = 0; k < 2000; k++) {
      const seed = pairSeed(k % 13, k, k * 0.5);
      const stream = k % 9;
      expect(glsl.hashUniform!(BigInt(seed), BigInt(stream))).toBe(hashUniform(seed, stream));
      expect(glsl.hashNormal!(BigInt(seed), BigInt(stream))).toBe(hashNormal(seed, stream));
    }
  });
});
