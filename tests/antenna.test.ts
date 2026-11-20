import { beforeAll, describe, expect, it } from 'vitest';
import { referenceField } from '../src/engine/cpu/field';
import { referenceStep, type ReferenceState } from '../src/engine/cpu/referenceStep';
import { DEFAULT_PROBE } from '../src/engine/field';
import { compileForce } from '../src/engine/forces/compile';
import { ParticleKind, ParticleSet, TEXEL } from '../src/engine/particles';
import { createRng } from '../src/engine/random';
import { DEFAULT_SETTINGS } from '../src/engine/settings';
import { findScenario } from '../src/scenarios';

// The antennas on the float64 reference: the swing stays in place for 40 periods at the speed and amplitude
// their descriptions state, and the time-averaged radiation far away has the pattern they describe.
const PERIODS = 40;
/** Observer distance of the pattern: about ten wavelengths, inside the history's reach c·(K − 1)·dt. */
const FAR = 600;

interface Run {
  /** Charge x after each step, and its peak speed |v|/c. */
  x: number[];
  peakBeta: number;
  stepsPerPeriod: number;
  /** Observer-time average of the transverse field² at FAR, by angle (degrees) from the axis of motion. */
  pattern: Map<number, number>;
}

function stated(description: string, pattern: RegExp): number {
  const match = pattern.exec(description);
  if (!match) throw new Error(`description does not match ${pattern}`);
  return Number(match[1]);
}

function run(id: string, angles: number[]): Run {
  const scenario = findScenario(id);
  const settings = { ...DEFAULT_SETTINGS, ...scenario.settings };
  const { particles } = scenario.build(createRng(1));
  const set = new ParticleSet(particles.length);
  set.setMetric(settings);
  set.addAll(particles);
  const definitions = scenario.forces();
  const forces = definitions.map(compileForce);
  const period = definitions[0]!.params.find((p) => p.name === 'T')!.value;
  const dt = settings.timeStep;
  const stepsPerPeriod = Math.round(period / dt);
  expect(stepsPerPeriod * dt).toBe(period);
  const charge = particles.findIndex((p) => p.kind === ParticleKind.dynamic);
  const c = settings.lightSpeed;
  const probes = angles.flatMap((deg) => [FAR * Math.cos((deg * Math.PI) / 180), FAR * Math.sin((deg * Math.PI) / 180), 0]);
  const pattern = new Map(angles.map((deg) => [deg, 0]));
  const state: ReferenceState = {};
  const x: number[] = [];
  let peakBeta = 0;
  const steps = PERIODS * stepsPerPeriod;
  for (let k = 0; k < steps; k++) {
    referenceStep(set, forces, settings, k * dt, state);
    const o = charge * TEXEL;
    x.push(set.position[o]!);
    const u = Math.hypot(set.velocity[o]!, set.velocity[o + 1]!, set.velocity[o + 2]!);
    peakBeta = Math.max(peakBeta, u / Math.sqrt(c * c + u * u));
    // The last period, long after the radiation reached FAR (FAR/c is a fraction of the run).
    if (k < steps - stepsPerPeriod) continue;
    const field = referenceField(set, forces, DEFAULT_PROBE, probes, (k + 1) * dt, c, state.history);
    angles.forEach((deg, p) => {
      const n = probes.slice(p * 3, p * 3 + 3).map((v) => v / FAR);
      const e = [field[p * 3]!, field[p * 3 + 1]!, field[p * 3 + 2]!];
      const radial = e[0]! * n[0]! + e[1]! * n[1]! + e[2]! * n[2]!;
      // The radiation term is transverse (n × …); the 1/r² Coulomb part far out is mostly along n.
      const transverse2 = e.reduce((sum, v, axis) => sum + (v - radial * n[axis]!) ** 2, 0);
      pattern.set(deg, pattern.get(deg)! + transverse2 / stepsPerPeriod);
    });
  }
  return { x, peakBeta, stepsPerPeriod, pattern };
}

/** Mean charge x over each whole period. */
function periodMeans({ x, stepsPerPeriod }: Run): number[] {
  return Array.from({ length: PERIODS }, (_, k) => x.slice(k * stepsPerPeriod, (k + 1) * stepsPerPeriod).reduce((a, b) => a + b, 0) / stepsPerPeriod);
}

function normalized(pattern: Map<number, number>): Map<number, number> {
  const top = Math.max(...pattern.values());
  return new Map([...pattern].map(([deg, value]) => [deg, value / top]));
}

const ANGLES = Array.from({ length: 19 }, (_, k) => k * 5);
/** Drift of the mean x per period over the run, and the swing's center: the float64 replay keeps both to ~1e-3. */
const IN_PLACE = 0.005;
const CENTERED = 0.01;

/** Hertz's sin²θ, strongest across the axis of motion (85° is already 0.995 of 90°). */
function hertz(pattern: Map<number, number>): void {
  for (const [deg, value] of pattern) expect(Math.abs(value - Math.sin((deg * Math.PI) / 180) ** 2)).toBeLessThan(0.1);
  expect(pattern.get(90)!).toBeGreaterThan(0.98);
}

/** Lobes leaning toward the axis: the peak about 40° from it, well above the value across it. */
function leaning(pattern: Map<number, number>): void {
  const peak = [...pattern].find(([, value]) => value === 1)![0];
  expect(peak).toBeGreaterThanOrEqual(35);
  expect(peak).toBeLessThanOrEqual(45);
  expect(pattern.get(90)!).toBeLessThan(0.9);
}

describe.each([
  { id: 'dipole-antenna', shape: "Hertz's sin²θ", check: hertz },
  { id: 'relativistic-antenna', shape: 'lobes leaning toward the axis', check: leaning },
])('$id', ({ id, shape, check }) => {
  const { description } = findScenario(id);
  // One run serves all of this scenario's tests.
  let result: Run;
  beforeAll(() => {
    result = run(id, ANGLES);
  });

  it('swings in place, centered, at the speed and amplitude its description states', () => {
    const means = periodMeans(result);
    for (const mean of means) expect(Math.abs(mean - means[0]!)).toBeLessThan(IN_PLACE);
    expect(Math.abs(means[0]!)).toBeLessThan(CENTERED);
    expect(result.peakBeta).toBeCloseTo(stated(description, /at up to ([\d.]+) c/), 2);
    const amplitude = (Math.max(...result.x) - Math.min(...result.x)) / 2;
    expect(amplitude).toBeCloseTo(stated(description, /([\d.]+) units either side/), 1);
  });

  it('radiates nothing along its axis of motion', () => {
    expect(normalized(result.pattern).get(0)!).toBeLessThan(0.01);
  });

  it(`radiates in ${shape}, averaged over a period`, () => check(normalized(result.pattern)));
});
