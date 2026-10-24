import { describe, expect, it } from 'vitest';
import { parseScenario } from '../src/scenarios/scenarioFile';
import { applyEvent, formatCaption, formatValue, reached, scaleTimeline } from '../src/scenarios/timeline';
import { DEFAULT_SETTINGS } from '../src/engine/settings';

const FORCES = [
  { name: 'Gravity (v1 1/d)', mode: 'force', range: 'long', expression: '-G * m_i * m_j / r', params: [{ name: 'G', value: 2 }] },
  { name: 'Coulomb', mode: 'force', range: 'long', expression: 'k * q_i * q_j / r^2', params: [{ name: 'k', value: 1 }] },
];
const scenario = (timeline: unknown) => parseScenario(JSON.stringify({
  format: 'particle.js-v2/scenario', version: 2, id: 't', name: 'T', settings: { friction: 0.5 }, forces: FORCES, timeline,
}), 't.json');

describe('scenario timeline', () => {
  it('parses set/multiply changes, captions and camera moves', () => {
    const [event] = scenario([{
      at: 10, set: { 'Gravity (v1 1/d).G': { multiply: 1e3 }, 'settings.friction': 0.1 },
      caption: 'G = {Gravity (v1 1/d).G}', camera: { position: [0, 0, 50], duration: 2 },
    }]).timeline;
    expect(event).toMatchObject({
      at: 10,
      changes: [
        { target: { kind: 'param', force: 'Gravity (v1 1/d)', param: 'G' }, op: 'multiply', value: 1e3 },
        { target: { kind: 'setting', key: 'friction' }, op: 'set', value: 0.1 },
      ],
      camera: { position: [0, 0, 50], target: [0, 0, 0], duration: 2 },
    });
  });

  it.each([
    [[{ at: 1, set: { 'Gravity.G': 2 } }], /timeline\[0\]\.set\['Gravity\.G'\]': no force named 'Gravity' \(have: Gravity \(v1 1\/d\), Coulomb\)/],
    [[{ at: 1, set: { 'Coulomb.q': 2 } }], /force 'Coulomb' has no parameter 'q' \(have: k\)/],
    [[{ at: 1, set: { 'settings.mode2D': 1 } }], /expected '<force name>\.<param>' or 'settings\.<timeStep\|friction/],
    [[{ at: 1, set: { 'Coulomb.k': { add: 1 } } }], /set\['Coulomb.k'\]': unknown key\(s\) add; allowed: multiply/],
    [[{ at: 5, caption: 'a' }, { at: 2, caption: 'b' }], /timeline\[1\]\.at': events must be in time order, got 2 after 5/],
    [[{ at: -1, caption: 'a' }], /must be >= 0, got -1/],
    [[{ at: 1 }], /event does nothing/],
    [[{ at: 1, caption: '{Coulomb.x}' }], /timeline\[0\]\.caption': force 'Coulomb' has no parameter 'x'/],
    [[{ at: 1, camera: { position: [0, 0, 1], duration: -1 } }], /camera\.duration': must be >= 0/],
  ])('rejects %j', (timeline, message) => {
    expect(() => scenario(timeline)).toThrow(message);
  });

  it('applies changes in order, multiplying the value current at that moment', () => {
    const s = scenario([{ at: 0, set: { 'Coulomb.k': 3, 'settings.friction': { multiply: 4 } } }, { at: 1, set: { 'Coulomb.k': { multiply: 10 } } }]);
    const forces = s.forces();
    const settings = { ...DEFAULT_SETTINGS, ...s.settings };
    const first = applyEvent(s.timeline[0]!, forces, settings);
    const second = applyEvent(s.timeline[1]!, first.forces, first.settings);
    expect(second.forces[1]!.params[0]!.value).toBe(30);
    expect(second.settings.friction).toBe(2);
    expect(forces[1]!.params[0]!.value).toBe(1);
    expect(second.missing).toEqual([]);
  });

  it('reports changes whose force the user removed and applies the rest', () => {
    const s = scenario([{ at: 0, set: { 'Coulomb.k': 3, 'settings.friction': 0 } }]);
    const result = applyEvent(s.timeline[0]!, s.forces().slice(0, 1), { ...DEFAULT_SETTINGS });
    expect(result.missing).toEqual(['Coulomb.k']);
    expect(result.settings.friction).toBe(0);
  });

  it('formats captions with the current values', () => {
    const s = scenario([{ at: 0, caption: 'x' }]);
    const text = formatCaption('Gravity: {Gravity (v1 1/d).G}\nFriction: {settings.friction} {unknown}', s.forces(), { ...DEFAULT_SETTINGS, friction: 1e-6 });
    expect(text).toBe('Gravity: 2\nFriction: 1.00e-6 {unknown}');
    expect([formatValue(9007.2), formatValue(0), formatValue(123456), formatValue(0.0125)]).toEqual(['9010', '0', '1.23e+5', '0.0125']);
  });

  it('counts a time reached despite float drift from summing steps', () => {
    let time = 0;
    for (let k = 0; k < 10; k++) time += 0.1;
    expect(time).toBeLessThan(1);
    expect(reached(time, 1, 0.1)).toBe(true);
    expect(reached(0.9, 1, 0.1)).toBe(false);
  });

  it('scales camera poses and absolute boundary sizes with the world, not factors or other values', () => {
    const s = scenario([{ at: 1, set: { 'settings.boundarySize': 100, 'settings.friction': 0.2, 'Coulomb.k': 3 }, camera: { position: [0, 0, 10], target: [1, 2, 0] } },
      { at: 2, set: { 'settings.boundarySize': { multiply: 2 } } }]);
    const [first, second] = scaleTimeline(s.timeline, 2);
    expect(first!.changes.map((c) => c.value)).toEqual([200, 0.2, 3]);
    expect(first!.camera).toMatchObject({ position: [0, 0, 20], target: [2, 4, 0] });
    expect(second!.changes[0]!.value).toBe(2);
    expect(s.timeline[0]!.changes[0]!.value).toBe(100);
  });

  it('is empty for unscripted scenarios', () => {
    expect(parseScenario(JSON.stringify({ format: 'particle.js-v2/scenario', version: 2, id: 'u', name: 'U' }), 'u.json').timeline).toEqual([]);
  });
});
