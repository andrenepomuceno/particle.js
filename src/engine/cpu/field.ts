import type { FieldProbe } from '../field';
import type { CompiledForce } from '../forces/compile';
import { TEXEL, type ParticleSet } from '../particles';
import { addPairForce, probeScope } from './pairs';

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
    const force: [number, number, number] = [0, 0, 0];
    for (let j = 0; j < set.count; j++) {
      const oj = j * TEXEL;
      const dx = positions[p * 3]! - pos[oj]!;
      const dy = positions[p * 3 + 1]! - pos[oj + 1]!;
      const dz = positions[p * 3 + 2]! - pos[oj + 2]!;
      const r2 = dx * dx + dy * dy + dz * dz;
      if (r2 === 0 || forces.length === 0) continue;
      const dist = Math.sqrt(r2);
      const pair = probeScope({ ...probe, position: [positions[p * 3]!, positions[p * 3 + 1]!, positions[p * 3 + 2]!] }, set, j, time);
      addPairForce(forces, pair, dist, force);
    }
    result.set(force, p * 3);
  }
  return result;
}
