import type { ParticleGroup, Shape } from './scenarioFile';

export interface ScaledGroups {
  groups: ParticleGroup[];
  /** Factor applied to lengths (largest over groups), used for the boundary and the camera. */
  linearScale: number;
}

const defaultTotal = (groups: readonly ParticleGroup[]) => groups.reduce((sum, g) => sum + g.count, 0);

/** Scales a shape so its density stays constant when it holds `factor` times more particles. */
function scaleShape(shape: Shape, factor: number, mode2D: boolean): { shape: Shape; linear: number } {
  switch (shape.type) {
    case 'point':
      return { shape, linear: 1 };
    case 'sphere': {
      // In 2D the ball is projected onto a disk, so its density is an area density.
      const linear = mode2D ? Math.sqrt(factor) : Math.cbrt(factor);
      return { shape: { ...shape, radius: shape.radius * linear }, linear };
    }
    case 'shell': {
      const linear = Math.sqrt(factor);
      return { shape: { ...shape, radius: shape.radius * linear }, linear };
    }
    case 'disk': {
      const linear = Math.sqrt(factor);
      return { shape: { ...shape, radius: shape.radius * linear, innerRadius: shape.innerRadius * linear }, linear };
    }
    case 'box': {
      const dimensions = Math.min(shape.size.filter((s) => s > 0).length, mode2D ? 2 : 3);
      const linear = dimensions === 0 ? 1 : factor ** (1 / dimensions);
      return { shape: { ...shape, size: shape.size.map((s) => s * linear) as typeof shape.size }, linear };
    }
    case 'grid': {
      // Axes with more than one site grow; a single-site grid grows in the plane (or in 3D).
      const growing = [shape.columns > 1, shape.rows > 1, !mode2D && shape.layers > 1];
      if (!growing.some(Boolean)) growing.splice(0, 3, true, true, false);
      const dimensions = growing.filter(Boolean).length;
      const linear = factor ** (1 / dimensions);
      const [columns, rows, layers] = [shape.columns, shape.rows, shape.layers].map((n, k) => (growing[k] ? Math.max(1, Math.ceil(n * linear)) : n)) as [number, number, number];
      return { shape: { ...shape, columns, rows, layers }, linear };
    }
  }
}

/**
 * Rescales the groups of a scenario to about `targetCount` particles at constant density: groups
 * marked `scale: false` keep their count, the others share the rest proportionally (rounded to
 * whole clusters) and their shapes grow by the matching root of the factor.
 */
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * Smallest count change that keeps a group's composition: its cluster size and the period of
 * every `{ cycle }` value, so a scaled quark soup still ends on a whole set (e.g. stays neutral).
 */
function countStep(group: ParticleGroup): number {
  let step = group.cluster?.size ?? 1;
  for (const value of Object.values(group)) {
    const cycle = (value as { cycle?: unknown } | undefined)?.cycle;
    if (Array.isArray(cycle) && cycle.length > 0) step = (step * cycle.length) / gcd(step, cycle.length);
  }
  return step;
}

export function scaleGroups(groups: readonly ParticleGroup[], targetCount: number | undefined, mode2D: boolean): ScaledGroups {
  const total = defaultTotal(groups);
  if (targetCount === undefined || targetCount === total) return { groups: [...groups], linearScale: 1 };
  if (!Number.isInteger(targetCount) || targetCount < 1) throw new Error(`particle count must be an integer >= 1, got ${targetCount}`);
  const pinned = groups.filter((g) => !g.scale).reduce((sum, g) => sum + g.count, 0);
  const scalable = total - pinned;
  if (scalable === 0) return { groups: [...groups], linearScale: 1 };
  if (targetCount <= pinned) {
    throw new Error(`particle count ${targetCount} leaves no room: ${pinned} particles are pinned with "scale": false`);
  }
  const factor = (targetCount - pinned) / scalable;
  let linearScale = 1;
  const scaled = groups.map((group) => {
    if (!group.scale) return group;
    const size = group.cluster?.size ?? 1;
    const step = countStep(group);
    const count = Math.max(step, Math.round((group.count * factor) / step) * step);
    const { shape, linear } = scaleShape(group.shape, count / group.count, mode2D);
    linearScale = Math.max(linearScale, linear);
    if (shape.type === 'grid' && shape.columns * shape.rows * shape.layers < count / size) {
      throw new Error(`scaled grid of ${shape.columns}×${shape.rows}×${shape.layers} sites cannot hold ${count / size} groups`);
    }
    return { ...group, count, shape };
  });
  return { groups: scaled, linearScale };
}
