import type { ParticleGroup, Shape } from './scenarioFile';

export interface ScaledGroups {
  groups: ParticleGroup[];
  /** Factor applied to lengths (largest over groups), used for the boundary and the camera. */
  linearScale: number;
}

const defaultTotal = (groups: readonly ParticleGroup[]) => groups.reduce((sum, g) => sum + g.count, 0);

/** Scales a shape so its density stays constant when it holds `factor` times more particles. */
function scaleShape(shape: Shape, factor: number): { shape: Shape; linear: number } {
  switch (shape.type) {
    case 'point':
      return { shape, linear: 1 };
    case 'sphere': {
      const linear = Math.cbrt(factor);
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
      const dimensions = shape.size.filter((s) => s > 0).length;
      const linear = dimensions === 0 ? 1 : factor ** (1 / dimensions);
      return { shape: { ...shape, size: shape.size.map((s) => s * linear) as typeof shape.size }, linear };
    }
    case 'grid': {
      const axes = [shape.columns, shape.rows, shape.layers];
      const dimensions = axes.filter((n) => n > 1).length || 1;
      const linear = factor ** (1 / dimensions);
      const grow = (n: number) => (n > 1 || dimensions === 0 ? Math.max(1, Math.ceil(n * linear)) : n);
      return { shape: { ...shape, columns: grow(shape.columns), rows: grow(shape.rows), layers: grow(shape.layers) }, linear };
    }
  }
}

/**
 * Rescales the groups of a scenario to about `targetCount` particles at constant density: groups
 * marked `scale: false` keep their count, the others share the rest proportionally (rounded to
 * whole clusters) and their shapes grow by the matching root of the factor.
 */
export function scaleGroups(groups: readonly ParticleGroup[], targetCount: number | undefined): ScaledGroups {
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
    const count = Math.max(size, Math.round((group.count * factor) / size) * size);
    const { shape, linear } = scaleShape(group.shape, count / group.count);
    linearScale = Math.max(linearScale, linear);
    return { ...group, count, shape };
  });
  return { groups: scaled, linearScale };
}
