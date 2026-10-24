import { describe, expect, it } from 'vitest';
import { createRng } from '../src/engine/random';
import { SCENARIOS } from '../src/scenarios';
import { parseScenario } from '../src/scenarios/scenarioFile';

const base = { format: 'particle.js-v2/scenario', version: 1, id: 't', name: 'Test' };
const parse = (extra: object) => parseScenario(JSON.stringify({ ...base, ...extra }), 'test.json');
const build = (extra: object, seed = 1) => {
  const scenario = parse(extra);
  return scenario.particles(createRng(seed));
};

describe('bundled scenario library', () => {
  it('parses every file with unique ids in file-name order', () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(['galaxy', 'plasma', 'nuclei', 'crystal', 'quarks', 'hadrons', 'sandbox']);
  });

  it.each(SCENARIOS.map((s) => [s.id, s] as const))('%s builds deterministically with valid forces', (_, scenario) => {
    const first = scenario.particles(createRng(scenario.seed));
    const second = scenario.particles(createRng(scenario.seed));
    expect(first).toEqual(second);
    expect(scenario.forces().length).toBeGreaterThan(0);
  });
});

describe('parseScenario', () => {
  it('fills documented defaults', () => {
    const scenario = parse({});
    expect(scenario.folder).toBe('Custom');
    expect(scenario.colorMode).toBe('charge');
    expect(scenario.settings.timeStep).toBe(1);
    expect(scenario.particles(createRng(1))).toEqual([]);
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
    [{ version: 2 }, /at 'version': unsupported version 2/],
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
    [{ groups: null }, /at 'groups': expected an array/],
    [{ seed: 1.5 }, /at 'seed': must be an integer >= 0, got 1.5/],
    [{ forces: [{ name: 'x', mode: 'force', range: 'short', expression: 'x' }] }, /at 'forces\[0\].cutoff': expected a finite number/],
    [{ groups: [{ count: 5, shape: { type: 'grid', spacing: 1, columns: 2, rows: 2 } }] }, /5 grid sites needed, a 2×2×1 grid has 4/],
  ])('rejects %j with its path', (extra, message) => {
    expect(() => parse(extra)).toThrow(message);
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
    expect(particles.every((p) => p.spin === 0.5 && p.mass >= 2 && p.mass <= 3)).toBe(true);
    expect(particles[0]).toMatchObject({ position: [1, 2, 3], color: [1, 0, 0], parity: 1, kind: 1 });
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
