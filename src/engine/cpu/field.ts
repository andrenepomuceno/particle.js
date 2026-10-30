import type { FieldProbe } from '../field';
import type { CompiledForce } from '../forces/compile';
import { TEXEL, type ParticleSet, type Vec3 } from '../particles';
import { retardedSource, type History } from './history';
import { addPairForce, probeScope } from './pairs';

/**
 * Float64 mirror of the GPU field pass: the net force Σ_j F on the test particle placed at
 * each probe position (xyz per probe). Probes are not particles, so no index is skipped;
 * a probe exactly on a particle ignores it, as coincident particles do. With the history of a
 * run (ReferenceState.history), retarded forces read their sources on each probe's light cone.
 */
export function referenceField(
  set: ParticleSet, forces: readonly CompiledForce[], probe: FieldProbe, positions: ArrayLike<number>, time: number, lightSpeed: number,
  history?: History,
): Float64Array {
  const retarded = history ? forces.filter((f) => f.retarded) : [];
  const instantaneous = history ? forces.filter((f) => !f.retarded) : forces;
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
      const at: Vec3 = [positions[p * 3]!, positions[p * 3 + 1]!, positions[p * 3 + 2]!];
      const pair = probeScope({ ...probe, position: at }, set, j, time, lightSpeed);
      addPairForce(instantaneous, pair, dist, force);
      if (retarded.length === 0) continue;
      const source = retardedSource(set, history!, j, at, time, lightSpeed);
      const distance = Math.hypot(...source.delta);
      if (distance === 0) continue;
      const [ux, uy, uz] = source.delta.map((c) => c / distance);
      const [vx_j, vy_j, vz_j] = source.velocity;
      const [ax_j, ay_j, az_j] = source.acceleration;
      addPairForce(retarded, { ...pair, ux: ux!, uy: uy!, uz: uz!, vx_j, vy_j, vz_j, ax_j, ay_j, az_j, t_ret: source.delay }, distance, force);
    }
    result.set(force, p * 3);
  }
  return result;
}
