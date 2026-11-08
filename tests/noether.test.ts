import { describe, expect, it } from 'vitest';
import { angularMomentumAbout, referencePotentials, summarizeEnergy, summarizeMomentum } from '../src/engine/cpu/energy';
import { referenceStep } from '../src/engine/cpu/referenceStep';
import { compileForce } from '../src/engine/forces/compile';
import { ParticleKind, ParticleSet, TEXEL, type Vec3 } from '../src/engine/particles';
import { createRng } from '../src/engine/random';
import { DEFAULT_SETTINGS } from '../src/engine/settings';
import { findScenario } from '../src/scenarios';

// The Noether scenarios on the reference integrator, scaled down to 32 particles and 800 steps (t = 200, past the
// cluster's collapse) to stay fast; `npm run record` measures the full-size runs on the GPU (docs/recording.md).
const COUNT = 32;
const STEPS = 800;
const SAMPLE_EVERY = 100;
const SEED = 7;

interface Sample {
  time: number;
  momentum: Vec3;
  angularMomentum: Vec3;
  energy: number;
  /** Σ m·|u| and Σ m·|r|·|u|: the sizes P and L could reach, against which their drift is measured. */
  momentumScale: number;
  angularScale: number;
  /** K + |V|, against which the energy's drift is measured. */
  energyScale: number;
}

function run(id: string): Sample[] {
  const scenario = findScenario(id);
  const settings = { ...DEFAULT_SETTINGS, ...scenario.settings };
  const { particles } = scenario.build(createRng(SEED), COUNT);
  const set = new ParticleSet(particles.length);
  set.setMetric(settings);
  set.addAll(particles);
  const forces = scenario.forces().map(compileForce);
  const measure = (time: number): Sample => {
    const energy = summarizeEnergy(set, set.velocity, referencePotentials(set, forces, time, settings.lightSpeed), forces, settings.mode2D);
    let momentumScale = 0;
    let angularScale = 0;
    for (let k = 0; k < set.count; k++) {
      const o = k * TEXEL;
      if (set.position[o + 3] === ParticleKind.fixed) continue;
      const p = set.attributes[o]! * Math.hypot(set.velocity[o]!, set.velocity[o + 1]!, set.velocity[o + 2]!);
      momentumScale += p;
      angularScale += p * Math.hypot(set.position[o]!, set.position[o + 1]!, set.position[o + 2]!);
    }
    return {
      time, ...summarizeMomentum(set, set.position, set.velocity), energy: energy.kinetic + energy.potential,
      momentumScale, angularScale, energyScale: energy.kinetic + Math.abs(energy.potential),
    };
  };
  const samples = [measure(0)];
  for (let k = 0; k < STEPS; k++) {
    referenceStep(set, forces, settings, k * settings.timeStep);
    if ((k + 1) % SAMPLE_EVERY === 0) samples.push(measure((k + 1) * settings.timeStep));
  }
  return samples;
}

const distance = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const largest = (samples: Sample[], value: (s: Sample) => number) => Math.max(...samples.map(value));

/** Largest drift of P from its start, relative to Σ m·|u|. */
const momentumDrift = (s: Sample[]) => largest(s, (x) => distance(x.momentum, s[0]!.momentum)) / largest(s, (x) => x.momentumScale);
/** Largest drift of L about `point` from its start, relative to Σ m·|r|·|u|. */
const angularDrift = (s: Sample[], point: Vec3 = [0, 0, 0]) => {
  const start = angularMomentumAbout(s[0]!, point);
  return largest(s, (x) => distance(angularMomentumAbout(x, point), start)) / largest(s, (x) => x.angularScale);
};
/** Largest drift of the energy from its start, relative to K + |V|. */
const energyDrift = (s: Sample[]) => largest(s, (x) => Math.abs(x.energy - s[0]!.energy)) / largest(s, (x) => x.energyScale);

// Conserved: P and L to the float32 storage's rounding (pair forces are equal and opposite and central, which
// Verlet keeps exactly), E to the integrator's O(dt²) error. Broken: changes a hundred times larger or more.
const ROUNDING = 1e-5;
const INTEGRATOR = 2e-3;
const BROKEN = 1e-2;

describe('Noether scenarios', () => {
  it('free cluster: momentum, angular momentum (about any point) and energy are conserved', () => {
    const s = run('noether-free');
    expect(momentumDrift(s)).toBeLessThan(ROUNDING);
    expect(angularDrift(s)).toBeLessThan(ROUNDING);
    expect(angularDrift(s, [150, -80, 0])).toBeLessThan(ROUNDING);
    expect(energyDrift(s)).toBeLessThan(INTEGRATOR);
  });

  it('a fixed sun breaks translation: momentum changes; angular momentum about the sun and energy hold', () => {
    const s = run('noether-sun');
    expect(momentumDrift(s)).toBeGreaterThan(BROKEN);
    expect(angularDrift(s)).toBeLessThan(ROUNDING);
    // About any other point the sun's pull has a torque.
    expect(angularDrift(s, [100, 0, 0])).toBeGreaterThan(BROKEN);
    expect(energyDrift(s)).toBeLessThan(INTEGRATOR);
  });

  it('two fixed suns break rotation about every point: angular momentum about the origin and either sun changes', () => {
    const s = run('noether-two-suns');
    expect(momentumDrift(s)).toBeGreaterThan(BROKEN);
    for (const point of [[0, 0, 0], [-150, 0, 0], [150, 0, 0]] as Vec3[]) expect(angularDrift(s, point)).toBeGreaterThan(BROKEN);
    expect(energyDrift(s)).toBeLessThan(INTEGRATOR);
  });

  it('a gravity growing in time breaks time symmetry: energy falls; momentum and angular momentum hold', () => {
    const s = run('noether-growing-gravity');
    expect(momentumDrift(s)).toBeLessThan(ROUNDING);
    expect(angularDrift(s)).toBeLessThan(ROUNDING);
    expect(energyDrift(s)).toBeGreaterThan(BROKEN);
    expect(s[s.length - 1]!.energy).toBeLessThan(s[0]!.energy);
  });
});
