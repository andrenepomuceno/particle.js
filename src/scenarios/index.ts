import { forceFromPreset, withParams } from '../engine/forces/presets';
import { defaultParticle, ParticleKind, type Particle, type Vec3 } from '../engine/particles';
import { inDisk, inSphere, pick, uniform } from '../engine/random';
import type { Scenario } from './types';

const COLORS: Vec3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const ANTI_COLORS: Vec3[] = COLORS.map((c) => c.map((v) => -v) as Vec3);

const galaxy: Scenario = {
  id: 'galaxy',
  name: 'Galaxy disk',
  folder: 'Gravity',
  description: 'A massive fixed core with a rotating disk of light bodies in near-circular orbits.',
  seed: 1,
  settings: { timeStep: 0.5 },
  forces: () => [withParams(forceFromPreset('gravity', { softening: 2 }), { G: 1 })],
  particles: (rng) => {
    const coreMass = 2e4;
    const bodies: Particle[] = [defaultParticle({ kind: ParticleKind.fixed, mass: coreMass })];
    for (let k = 0; k < 3000; k++) {
      const [x, y] = inDisk(rng, 600);
      const r = Math.max(Math.hypot(x, y), 40);
      const speed = Math.sqrt(coreMass / r);
      bodies.push(defaultParticle({
        position: [x, y, uniform(rng, -10, 10)],
        velocity: [(-y / r) * speed, (x / r) * speed, 0],
        mass: uniform(rng, 0.5, 1.5),
      }));
    }
    return bodies;
  },
  cameraDistance: 1400,
  particleRadius: 3,
  colorMode: 'speed',
};

const plasma: Scenario = {
  id: 'plasma',
  name: 'Neutral plasma',
  folder: 'Electromagnetism',
  description: 'Equal numbers of positive and negative charges inside a reflecting sphere.',
  seed: 2,
  settings: { timeStep: 0.2, boundary: 'sphere', boundarySize: 400, maxSpeed: 20 },
  forces: () => [forceFromPreset('coulomb', { softening: 3 }), withParams(forceFromPreset('gravity'), { G: 0.1 })],
  particles: (rng) =>
    Array.from({ length: 2000 }, (_, k) =>
      defaultParticle({ position: inSphere(rng, 350), charge: k % 2 === 0 ? 1 : -1, mass: k % 2 === 0 ? 10 : 1 }),
    ),
  cameraDistance: 1100,
  particleRadius: 3,
  colorMode: 'charge',
};

const nuclei: Scenario = {
  id: 'nuclei',
  name: 'Nuclear clusters',
  folder: 'Short range',
  description: 'v1-style short-range sine force plus Coulomb repulsion: charged nucleons clump into nuclei.',
  seed: 3,
  settings: { timeStep: 0.5, mode2D: true, friction: 0.002 },
  forces: () => [
    withParams(forceFromPreset('nuclear', { cutoff: 12 }), { k: 2 }),
    withParams(forceFromPreset('coulomb', { softening: 1 }), { k: 0.5 }),
  ],
  particles: (rng) =>
    Array.from({ length: 1500 }, () =>
      defaultParticle({ position: inDisk(rng, 400), charge: pick(rng, [0, 1]), mass: 1 }),
    ),
  cameraDistance: 1000,
  particleRadius: 2,
  colorMode: 'charge',
};

const crystal: Scenario = {
  id: 'crystal',
  name: 'Lennard-Jones crystal',
  folder: 'Short range',
  description: 'A cooling Lennard-Jones gas in a box condenses into a hexagonal lattice.',
  seed: 4,
  settings: { timeStep: 0.05, mode2D: true, boundary: 'box', boundarySize: 300, friction: 0.05, maxSpeed: 50 },
  forces: () => [withParams(forceFromPreset('lennardJones'), { epsilon: 5, sigma: 10 })],
  particles: (rng) =>
    Array.from({ length: 1200 }, () =>
      defaultParticle({ position: [uniform(rng, -280, 280), uniform(rng, -280, 280), 0], velocity: [uniform(rng, -2, 2), uniform(rng, -2, 2), 0] }),
    ),
  cameraDistance: 800,
  particleRadius: 4,
  colorMode: 'speed',
};

const quarks: Scenario = {
  id: 'quarks',
  name: 'Color confinement',
  folder: 'Color charge',
  description: 'Red, green and blue charges under a Cornell potential; unlike colors bind into neutral groups.',
  seed: 5,
  settings: { timeStep: 0.1, mode2D: true, friction: 0.02, boundary: 'box', boundarySize: 400 },
  forces: () => [forceFromPreset('color')],
  particles: (rng) =>
    Array.from({ length: 900 }, (_, k) =>
      defaultParticle({
        position: inDisk(rng, 350),
        color: k % 6 < 3 ? COLORS[k % 3]! : ANTI_COLORS[k % 3]!,
        spin: pick(rng, [-0.5, 0.5]),
      }),
    ),
  cameraDistance: 900,
  particleRadius: 3,
  colorMode: 'color',
};

const sandbox: Scenario = {
  id: 'sandbox',
  name: 'Sandbox',
  folder: 'Sandbox',
  description: 'Empty space with gravity and Coulomb. Press G to generate particles.',
  seed: 6,
  settings: { timeStep: 0.5 },
  forces: () => [forceFromPreset('gravity'), forceFromPreset('coulomb')],
  particles: () => [],
  cameraDistance: 800,
  particleRadius: 3,
  colorMode: 'charge',
};

export const SCENARIOS: readonly Scenario[] = [galaxy, plasma, nuclei, crystal, quarks, sandbox];

export function findScenario(id: string): Scenario {
  const scenario = SCENARIOS.find((s) => s.id === id);
  if (!scenario) throw new Error(`unknown scenario '${id}'; available: ${SCENARIOS.map((s) => s.id).join(', ')}`);
  return scenario;
}
