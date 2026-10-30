/**
 * Random numbers of force expressions (`rand`, `randn`, `randv`). Each value is a pure function of
 * the unordered pair {i, j}, the evaluation time as float32 bits and a stream number, so the GPU and
 * the float64 reference draw the same numbers and both members of a pair see the same ones.
 *
 * The hash is PCG's output permutation used as an integer hash (`pcg_hash` in Jarzynski & Olano,
 * "Hash Functions for GPU Rendering", JCGT 2020), nested over the inputs as that paper does:
 * seed = H(timeBits + H(max + H(min))), stream k = H(seed + k). It is written twice, here with
 * Math.imul and `>>> 0` and in GLSL_NOISE_HELPERS with uint arithmetic (which wraps mod 2³²), and the
 * two give identical uint32 values.
 */

/** What a pair's forces read; field probes and plots use MEAN_NOISE so arrows and curves stay still. */
export interface PairNoise {
  rand: number;
  randn: number;
  /** randv's components: three independent normals. */
  randvx: number;
  randvy: number;
  randvz: number;
}

/** Hash streams of each value: a uniform uses one, a normal two (Box–Muller: `stream` and `stream + 1`). */
export const NOISE_STREAMS: Readonly<Record<keyof PairNoise, { stream: number; normal: boolean }>> = {
  rand: { stream: 0, normal: false },
  randn: { stream: 1, normal: true },
  randvx: { stream: 3, normal: true },
  randvy: { stream: 5, normal: true },
  randvz: { stream: 7, normal: true },
};

export const MEAN_NOISE: Readonly<PairNoise> = { rand: 0.5, randn: 0, randvx: 0, randvy: 0, randvz: 0 };

/** 2⁻²⁴ (5.9604644775390625e-8 in the GLSL): the top 24 bits of a hash scaled to [0, 1), exact in float32 and float64. */
const UNIFORM_SCALE = 2 ** -24;

/** pcg_hash: one 32-bit integer in, one out (inputs are taken mod 2³²). */
export function pcgHash(input: number): number {
  const state = (Math.imul(input, 747796405) + 2891336453) >>> 0;
  const word = Math.imul((state >>> ((state >>> 28) + 4)) ^ state, 277803737) >>> 0;
  return ((word >>> 22) ^ word) >>> 0;
}

/** IEEE float32 bit pattern of x after rounding to float32 (what the GPU's uTime holds). */
export function float32Bits(x: number): number {
  return new Uint32Array(Float32Array.of(x).buffer)[0]!;
}

/** Seed shared by every stream of the pair {i, j} at `time`; symmetric in i and j. */
export function pairSeed(i: number, j: number, time: number): number {
  if (!(Number.isInteger(i) && i >= 0 && Number.isInteger(j) && j >= 0)) {
    throw new Error(`pair indices must be integers >= 0, got ${i} and ${j}`);
  }
  const inner = pcgHash((Math.max(i, j) + pcgHash(Math.min(i, j))) >>> 0);
  return pcgHash((float32Bits(time) + inner) >>> 0);
}

/** Uniform in [0, 1 − 2⁻²⁴], a multiple of 2⁻²⁴. */
export function hashUniform(seed: number, stream: number): number {
  return (pcgHash((seed + stream) >>> 0) >>> 8) * UNIFORM_SCALE;
}

/**
 * Standard normal by Box–Muller from streams `stream` and `stream + 1`. log sees 1 − u in
 * [2⁻²⁴, 1], never 0; the angle π(2u − 1) is exact in float32 and stays in [−π, π), where the
 * GPU's cos is most accurate (cos(π(2u − 1)) = −cos(2πu), the same distribution).
 */
export function hashNormal(seed: number, stream: number): number {
  const radius = Math.sqrt(-2 * Math.log(1 - hashUniform(seed, stream)));
  return radius * Math.cos(Math.PI * (2 * hashUniform(seed, stream + 1) - 1));
}

/** Every random variable of the pair {i, j} at `time`, as the GPU computes them. */
export function pairNoise(i: number, j: number, time: number): PairNoise {
  const seed = pairSeed(i, j, time);
  const sample = ({ stream, normal }: { stream: number; normal: boolean }) => (normal ? hashNormal(seed, stream) : hashUniform(seed, stream));
  return {
    rand: sample(NOISE_STREAMS.rand),
    randn: sample(NOISE_STREAMS.randn),
    randvx: sample(NOISE_STREAMS.randvx),
    randvy: sample(NOISE_STREAMS.randvy),
    randvz: sample(NOISE_STREAMS.randvz),
  };
}

/**
 * GLSL twins of pcgHash, pairSeed (taking min, max and the time bits), hashUniform and hashNormal.
 * Integer statements assign every wrapped uint before shifting it, which tests/noise.test.ts relies
 * on to check this text against the functions above.
 */
export const GLSL_NOISE_HELPERS = /* glsl */ `
uint pcgHash(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}
uint pairSeed(uint lo, uint hi, uint timeBits) {
  uint inner = pcgHash(hi + pcgHash(lo));
  return pcgHash(timeBits + inner);
}
float hashUniform(uint seed, uint stream) {
  return float(pcgHash(seed + stream) >> 8u) * 5.9604644775390625e-8;
}
float hashNormal(uint seed, uint stream) {
  float radius = sqrt(-2.0 * log(1.0 - hashUniform(seed, stream)));
  return radius * cos(${Math.PI} * (2.0 * hashUniform(seed, stream + 1u) - 1.0));
}
`;
