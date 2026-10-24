import type { FieldProbe } from '../field';
import type { CompiledForce } from '../forces/compile';
import { TEXEL, type ParticleSet } from '../particles';
import { pairTerm, probeScope } from './pairs';

/**
 * Float64 mirror of the GPU field pass: the net force Σ_j F on the test particle placed at
 * each probe position (xyz per probe). Probes are not particles, so no index is skipped;
 * a probe exactly on a particle ignores it, as coincident particles do.
 */
export function referenceField(
  set: ParticleSet, forces: readonly CompiledForce[], probe: FieldProbe, positions: ArrayLike<number>, time: number,
): Float64Array {
  const count = positions.length / 3;
  const result = new Float64Array(count * 3);
  const pos = set.position;
  for (let p = 0; p < count; p++) {
    let fx = 0;
    let fy = 0;
    let fz = 0;
    for (let j = 0; j < set.count; j++) {
      const oj = j * TEXEL;
      const dx = positions[p * 3]! - pos[oj]!;
      const dy = positions[p * 3 + 1]! - pos[oj + 1]!;
      const dz = positions[p * 3 + 2]! - pos[oj + 2]!;
      const r2 = dx * dx + dy * dy + dz * dz;
      if (r2 === 0 || forces.length === 0) continue;
      const dist = Math.sqrt(r2);
      const pair = probeScope({ ...probe, position: [positions[p * 3]!, positions[p * 3 + 1]!, positions[p * 3 + 2]!] }, set, j, time);
      let magnitude = 0;
      for (const f of forces) magnitude += pairTerm(f, f.evaluate, pair, r2, dist);
      fx += (magnitude * dx) / dist;
      fy += (magnitude * dy) / dist;
      fz += (magnitude * dz) / dist;
    }
    result.set([fx, fy, fz], p * 3);
  }
  return result;
}
