import { describe, expect, it } from 'vitest';
import { DEFAULT_PROBE } from '../src/engine/field';
import { compileForce } from '../src/engine/forces/compile';
import { ParticleSet } from '../src/engine/particles';
import { createRng } from '../src/engine/random';
import { DEFAULT_SETTINGS } from '../src/engine/settings';
import { SCENARIOS } from '../src/scenarios';
import { parseScenario } from '../src/scenarios/scenarioFile';

const base = { format: 'particle.js-v2/scenario', version: 1, id: 't', name: 'Test' };
const parse = (extra: object) => parseScenario(JSON.stringify({ ...base, ...extra }), 'test.json');
const build = (extra: object, seed = 1) => {
  const scenario = parse(extra);
  return scenario.build(createRng(seed)).particles;
};

describe('bundled scenario library', () => {
  it('parses every file with unique ids in file-name order', () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual([
      'galaxy', 'noether-free', 'noether-sun', 'noether-two-suns', 'noether-growing-gravity', 'plasma', 'nuclei', 'crystal', 'crystal-slab', 'dpd-thermostat', 'dipole-chains', 'dipole-crystal', 'radiation-belt', 'cyclotron', 'beam-pinch', 'quarks', 'hadrons', 'twin-clocks', 'relativistic-cyclotron', 'retarded-field', 'dipole-antenna', 'welcome', 'the-egg', 'gravity',
      'experiments-4', 'hexagonal-crystal-quarks', 'air', 'water-2', 'essential-elements', 'periodic-table', 'hexagonal-crystal', 'tetragonal-crystal', 'hydrogen', 'helium',
      'water', 'super-nucleus-3d', 'plasma-ball', 'strong-blob', 'standard-model', 'standard-model-1', 'wild-particles', 'planetoid-formation', 'hexagon-1', 'hexagon-2',
      'hexagon-3', 'terrarium', 'sandbox',
    ]);
  });

  it.each(SCENARIOS.map((s) => [s.id, s] as const))('%s builds deterministically with valid forces, below its c', (_, scenario) => {
    const first = scenario.build(createRng(scenario.seed ?? 1)).particles;
    const second = scenario.build(createRng(scenario.seed ?? 1)).particles;
    expect(first).toEqual(second);
    scenario.forces().forEach((force) => expect(() => compileForce(force)).not.toThrow());
    // Under Minkowski every particle must start below c (the set refuses it otherwise).
    const set = new ParticleSet(Math.max(first.length, 1));
    set.setMetric({ ...DEFAULT_SETTINGS, ...scenario.settings });
    expect(() => set.addAll(first)).not.toThrow();
  });
});

describe('parseScenario', () => {
  it('fills documented defaults', () => {
    const scenario = parse({});
    expect(scenario.folder).toBe('Custom');
    expect(scenario.colorMode).toBe('charge');
    expect(scenario.settings.timeStep).toBe(1);
    expect(scenario.build(createRng(1)).particles).toEqual([]);
  });

  it('expands presets with overrides and full definitions', () => {
    const forces = parse({
      forces: [
        { preset: 'gravity', softening: 5, enabled: false, params: { G: 2 } },
        { name: 'custom', mode: 'force', range: 'short', cutoff: 3, expression: 'k * x', params: [{ name: 'k', value: 4 }] },
      ],
    }).forces();
    expect(forces[0]).toMatchObject({ name: 'Gravity', softening: 5, enabled: false, params: [{ name: 'G', value: 2 }] });
    expect(forces[1]).toMatchObject({ name: 'custom', enabled: true, softening: 0, cutoff: 3 });
  });

  it.each([
    [{ format: 'nope' }, /at 'format': expected 'particle.js-v2\/scenario'/],
    [{ version: 3 }, /at 'version': expected one of 1, 2, got 3/],
    [{ colour: 1 }, /at '\$': unknown key\(s\) colour/],
    [{ settings: { timestep: 1 } }, /at 'settings': unknown key\(s\) timestep/],
    [{ settings: { timeStep: -1 } }, /timeStep must be > 0/],
    [{ forces: [{ preset: 'magic' }] }, /at 'forces\[0\].preset': expected one of gravity/],
    [{ forces: [{ preset: 'gravity', params: { H: 1 } }] }, /at 'forces\[0\].params': force 'Gravity' has no parameter 'H'/],
    [{ forces: [{ name: 'x', mode: 'force', range: 'long', expression: 'zz' }] }, /at 'forces\[0\]'.*unknown variable 'zz'/],
    [{ groups: [{ count: 0, shape: { type: 'point' } }] }, /at 'groups\[0\].count': must be an integer >= 1/],
    [{ groups: [{ count: 1, shape: { type: 'cube' } }] }, /at 'groups\[0\].shape.type'/],
    [{ groups: [{ count: 1, shape: { type: 'disk', radius: 5, innerRadius: 5 } }] }, /innerRadius': must be within \[0, radius=5\)/],
    [{ groups: [{ count: 1, shape: { type: 'point' }, mass: { choice: [1, 0] } }] }, /every possible mass must be > 0/],
    [{ groups: [{ count: 1, shape: { type: 'point' }, charge: { min: 2, max: 1 } }] }, /min 2 is greater than max 1/],
    [{ groups: [{ count: 1, shape: { type: 'point' }, color: { cycle: [] } }] }, /color.cycle': must not be empty/],
    [{ view: { colorMode: 'neon' } }, /at 'view.colorMode'/],
    [{ view: { sizeByMass: 1 } }, /at 'view.sizeByMass'/],
    [{ groups: null }, /at 'groups': expected an array/],
    [{ seed: 1.5 }, /at 'seed': must be an integer >= 0, got 1.5/],
    [{ forces: [{ name: 'x', mode: 'force', range: 'short', expression: 'x' }] }, /at 'forces\[0\].cutoff': expected a finite number/],
    [{ groups: [{ count: 5, shape: { type: 'grid', spacing: 1, columns: 2, rows: 2 } }] }, /5 grid sites needed, a 2×2×1 grid has 4/],
  ])('rejects %j with its path', (extra, message) => {
    expect(() => parse(extra)).toThrow(message);
  });

  it('leaves the seed to each start unless the file fixes one', () => {
    expect(parse({}).seed).toBeUndefined();
    expect(parse({ seed: 42 }).seed).toBe(42);
    expect(() => parse({ seed: -1 })).toThrow(/at 'seed': must be an integer >= 0, got -1/);
    expect(SCENARIOS.filter((s) => s.seed !== undefined).map((s) => s.id)).toEqual([]);
  });

  it('reads view.field: true, or options over the defaults, and rejects bad ones with their path', () => {
    expect(parse({ view: { field: true } }).field).toEqual({});
    expect(parse({}).field).toBeUndefined();
    expect(parse({ view: { field: { columns: 32, logScale: true, probe: { charge: -1, spin: [0, 0, 1] } } } }).field).toEqual({
      columns: 32, logScale: true, probe: { ...DEFAULT_PROBE, charge: -1, spin: [0, 0, 1] },
    });
    expect(() => parse({ view: { field: { columns: 1 } } })).toThrow(/view.field.columns': field grid columns must be an integer in \[2, 256\]/);
    expect(() => parse({ view: { field: { probe: { mass: 0 } } } })).toThrow(/view.field.probe': test particle mass must be > 0/);
    expect(() => parse({ view: { field: { probe: { velocity: [1, 0, 0] } } } })).toThrow(/view.field.probe/);
    expect(() => parse({ view: { field: false } })).toThrow(/view.field/);
  });

  it('runs Neutral plasma with the full electromagnetic force under Minkowski', () => {
    const plasma = SCENARIOS.find((s) => s.id === 'plasma')!;
    expect([plasma.settings.metric, plasma.settings.lightSpeed, plasma.settings.maxSpeed]).toEqual(['minkowski', 20, 0]);
    expect(plasma.forces().map((f) => f.name)).toEqual(expect.arrayContaining(['Coulomb', 'Magnetic (Biot–Savart)']));
  });

  it('shows the field in every Elements scenario', () => {
    expect(SCENARIOS.filter((s) => s.folder === 'Elements').map((s) => [s.id, s.field !== undefined])).toEqual([
      ['hydrogen', true], ['helium', true], ['water', true],
    ]);
  });

  it('names the source file in errors', () => {
    expect(() => parseScenario('{', 'broken.json')).toThrow(/invalid scenario broken.json at '\$': not valid JSON/);
  });
});

describe('particle groups', () => {
  it('samples fixed values, cycles, choices and ranges', () => {
    const particles = build({
      groups: [{ count: 6, shape: { type: 'point', center: [1, 2, 3] }, charge: { cycle: [1, -1, 0] }, spin: { choice: [0.5] }, mass: { min: 2, max: 3 }, color: [1, 0, 0] }],
    });
    expect(particles.map((p) => p.charge)).toEqual([1, -1, 0, 1, -1, 0]);
    expect(particles.every((p) => p.spin[2] === 0.5 && p.spin[0] === 0 && p.mass >= 2 && p.mass <= 3)).toBe(true);
    expect(particles[0]).toMatchObject({ position: [1, 2, 3], color: [1, 0, 0], parity: 1, kind: 1 });
  });

  it('cycles random speeds per particle', () => {
    const particles = build({ groups: [{ count: 4, shape: { type: 'point' }, velocity: { type: 'random', speed: { cycle: [1, 2] } } }] });
    particles.forEach((p, index) => expect(Math.hypot(...p.velocity)).toBeCloseTo([1, 2][index % 2]!, 9));
  });

  it('places every particle on z = 0 in 2D mode', () => {
    const particles = build({ settings: { mode2D: true }, groups: [{ count: 50, shape: { type: 'sphere', radius: 10 } }] });
    expect(particles.every((p) => p.position[2] === 0)).toBe(true);
  });

  it('places cluster members on an equilateral ring around a shared center', () => {
    const particles = build({ groups: [{ count: 6, cluster: { size: 3, radius: 2 }, shape: { type: 'grid', spacing: 100, columns: 2, rows: 1 } }] });
    for (const triplet of [particles.slice(0, 3), particles.slice(3)]) {
      const sides = ([[0, 1], [1, 2], [2, 0]] as const).map(([a, b]) => Math.hypot(...triplet[a]!.position.map((c, k) => c - triplet[b]!.position[k]!)));
      sides.forEach((side) => expect(side).toBeCloseTo(2 * Math.sqrt(3), 9));
      const center = [0, 1, 2].map((k) => triplet.reduce((s, p) => s + p.position[k]!, 0) / 3);
      expect(Math.abs(center[0]!)).toBeCloseTo(50, 9);
    }
  });

  it.each([
    [{ count: 4, cluster: { size: 3, radius: 1 }, shape: { type: 'point' } }, /4 is not a multiple of cluster.size 3/],
    [{ count: 9, cluster: { size: 3, radius: 1 }, shape: { type: 'grid', spacing: 1, columns: 2, rows: 1 } }, /3 grid sites needed, a 2×1×1 grid has 2/],
    [{ count: 3, cluster: { size: 3, radius: 0 }, shape: { type: 'point' } }, /cluster.radius': must be > 0/],
  ])('rejects bad clusters %#', (group, message) => {
    expect(() => parse({ groups: [group] })).toThrow(message);
  });

  it('gives every member of a cluster the same velocity', () => {
    const particles = build({ groups: [{ count: 30, cluster: { size: 3, radius: 1 }, shape: { type: 'disk', radius: 50 }, velocity: { type: 'random', speed: 4 } }] });
    for (let k = 0; k < 30; k += 3) {
      expect(particles[k + 1]!.velocity).toEqual(particles[k]!.velocity);
      expect(particles[k + 2]!.velocity).toEqual(particles[k]!.velocity);
    }
  });

  it('fills attributes from species, cycled per particle, with explicit keys winning', () => {
    const particles = build({ groups: [{ count: 3, shape: { type: 'point' }, species: { cycle: ['u', 'u', 'd'] }, mass: 2 }] });
    expect(particles.map((p) => [p.charge, p.isospin, p.nuclearCharge, p.mass])).toEqual([
      [2 / 3, 0.5, 1 / 3, 2], [2 / 3, 0.5, 1 / 3, 2], [-1 / 3, -0.5, 1 / 3, 2],
    ]);
  });

  it('migrates scalar spin variables in version 1 scenario forces', () => {
    const forces = parse({ version: 1, forces: [{ name: 's', mode: 'force', range: 'long', expression: 's_i * s_j / r^4' }] }).forces();
    expect(forces[0]!.expression).toBe('sz_i * sz_j / r^4');
  });

  it('accepts vector spin and the second charge', () => {
    const [p] = build({ groups: [{ count: 1, shape: { type: 'point' }, spin: [1, 2, 3], charge2: -1 }] });
    expect(p).toMatchObject({ spin: [1, 2, 3], charge2: -1 });
    expect(() => parse({ groups: [{ count: 1, shape: { type: 'point' }, species: 'quark' }] })).toThrow(/species': expected one of u, d/);
  });

  it('lays out grids centered on their center', () => {
    const particles = build({ groups: [{ count: 4, shape: { type: 'grid', spacing: 2, columns: 2, rows: 2 } }] });
    expect(particles.map((p) => p.position)).toEqual([[-1, -1, 0], [1, -1, 0], [-1, 1, 0], [1, 1, 0]]);
  });

  it('keeps shapes inside their bounds', () => {
    const particles = build({
      groups: [
        { count: 200, shape: { type: 'sphere', radius: 10 } },
        { count: 200, shape: { type: 'shell', radius: 10 } },
        { count: 200, shape: { type: 'disk', radius: 10, innerRadius: 5, thickness: 2 } },
        { count: 200, shape: { type: 'box', size: [4, 6, 0] } },
      ],
    });
    const r = (p: { position: number[] }) => Math.hypot(...p.position);
    expect(particles.slice(0, 200).every((p) => r(p) <= 10)).toBe(true);
    expect(particles.slice(200, 400).every((p) => Math.abs(r(p) - 10) < 1e-9)).toBe(true);
    expect(particles.slice(400, 600).every((p) => Math.hypot(p.position[0], p.position[1]) >= 5 && Math.abs(p.position[2]) <= 1)).toBe(true);
    expect(particles.slice(600).every((p) => Math.abs(p.position[0]) <= 2 && Math.abs(p.position[1]) <= 3 && p.position[2] === 0)).toBe(true);
  });

  it('gives circular orbit speeds and leaves fixed particles still', () => {
    const particles = build({
      groups: [
        { count: 1, kind: 'fixed', shape: { type: 'point' }, velocity: { type: 'constant', value: [1, 1, 1] } },
        { count: 1, shape: { type: 'point', center: [4, 0, 0] }, velocity: { type: 'orbit', centralMass: 100, G: 1 } },
        { count: 50, shape: { type: 'point' }, velocity: { type: 'random', speed: 3 } },
      ],
    });
    expect(particles[0]!.velocity).toEqual([0, 0, 0]);
    expect(particles[1]!.velocity[1]).toBeCloseTo(5, 12);
    expect(particles.slice(2).every((p) => Math.abs(Math.hypot(...p.velocity) - 3) < 1e-9)).toBe(true);
  });
});
