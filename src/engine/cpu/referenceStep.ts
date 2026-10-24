import { forceScope, type CompiledForce, type PairScope } from '../forces/compile';
import { ParticleKind, TEXEL, type ParticleSet } from '../particles';
import type { SimulationSettings } from '../settings';

/**
 * Float64 mirror of the GPU velocity/position passes. It exists to pin down
 * the integrator semantics in unit tests and to cross-check GPU output.
 */
export function referenceStep(
  set: ParticleSet,
  forces: readonly CompiledForce[],
  settings: SimulationSettings,
  time: number,
): void {
  const { position: pos, velocity: vel, attributes: attr, color } = set;
  const dt = settings.timeStep;
  const nextVelocity = new Float64Array(set.count * TEXEL);

  for (let i = 0; i < set.count; i++) {
    const oi = i * TEXEL;
    const tau1 = vel[oi + 3]!;
    if (pos[oi + 3] === ParticleKind.fixed) {
      nextVelocity.set([0, 0, 0, tau1 + dt], oi);
      continue;
    }
    const force = [0, 0, 0];
    for (let j = 0; j < set.count; j++) {
      if (j === i) continue;
      const oj = j * TEXEL;
      const delta = [0, 1, 2].map((k) => pos[oi + k]! - pos[oj + k]!) as [number, number, number];
      const r2 = delta[0] ** 2 + delta[1] ** 2 + delta[2] ** 2;
      if (r2 === 0) continue;
      const dist = Math.sqrt(r2);
      const pair: Omit<PairScope, 'r'> = {
        m_i: attr[oi]!, m_j: attr[oj]!,
        q_i: attr[oi + 1]!, q_j: attr[oj + 1]!,
        s_i: attr[oi + 2]!, s_j: attr[oj + 2]!,
        p_i: attr[oi + 3]!, p_j: attr[oj + 3]!,
        cr_i: color[oi]!, cg_i: color[oi + 1]!, cb_i: color[oi + 2]!,
        cr_j: color[oj]!, cg_j: color[oj + 1]!, cb_j: color[oj + 2]!,
        t_i: tau1, t_j: vel[oj + 3]!,
        time,
      };
      let magnitude = 0;
      for (const f of forces) {
        if (f.definition.range === 'short' && !(dist < f.definition.cutoff)) continue;
        const r = Math.sqrt(r2 + f.definition.softening ** 2);
        magnitude += f.evaluate(forceScope(f, { ...pair, r }));
      }
      for (let k = 0; k < 3; k++) force[k]! += (magnitude * delta[k]!) / dist;
    }

    const v = [0, 1, 2].map((k) => vel[oi + k]! + (dt * force[k]!) / attr[oi]!);
    if (settings.friction > 0) v.forEach((_, k) => (v[k]! *= Math.exp(-settings.friction * dt)));
    if (settings.mode2D) v[2] = 0;
    const speed = Math.hypot(v[0]!, v[1]!, v[2]!);
    if (settings.maxSpeed > 0 && speed > settings.maxSpeed) v.forEach((_, k) => (v[k]! *= settings.maxSpeed / speed));
    bounceVelocity(v, [0, 1, 2].map((k) => pos[oi + k]! + dt * v[k]!), settings);
    nextVelocity.set([v[0]!, v[1]!, v[2]!, tau1 + dt], oi);
  }

  vel.set(nextVelocity);
  for (let i = 0; i < set.count; i++) {
    const o = i * TEXEL;
    if (pos[o + 3] === ParticleKind.fixed) continue;
    const p = [0, 1, 2].map((k) => pos[o + k]! + dt * vel[o + k]!);
    if (settings.mode2D) p[2] = 0;
    confinePosition(p, settings);
    pos.set(p, o);
  }
}

function bounceVelocity(v: number[], next: number[], settings: SimulationSettings): void {
  const size = settings.boundarySize;
  if (settings.boundary === 'sphere') {
    const len = Math.hypot(next[0]!, next[1]!, next[2]!);
    if (len <= size) return;
    const normal = next.map((c) => c / len);
    const outward = v[0]! * normal[0]! + v[1]! * normal[1]! + v[2]! * normal[2]!;
    if (outward > 0) v.forEach((_, k) => (v[k]! -= (1 + settings.restitution) * outward * normal[k]!));
  } else if (settings.boundary === 'box') {
    for (let k = 0; k < 3; k++) {
      if (Math.abs(next[k]!) > size && next[k]! * v[k]! > 0) v[k] = -settings.restitution * v[k]!;
    }
  }
}

function confinePosition(p: number[], settings: SimulationSettings): void {
  const size = settings.boundarySize;
  if (settings.boundary === 'sphere') {
    const len = Math.hypot(p[0]!, p[1]!, p[2]!);
    if (len > size) p.forEach((_, k) => (p[k]! *= size / len));
  } else if (settings.boundary === 'box') {
    p.forEach((c, k) => (p[k] = Math.min(Math.max(c, -size), size)));
  }
}
