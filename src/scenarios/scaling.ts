import { isPlanar, type SimulationSettings } from '../engine/settings';
import type { ParticleGroup, Shape } from './scenarioFile';

export interface ScaledGroups {
  groups: ParticleGroup[];
  /**
   * Factor applied to lengths (largest over groups), used for the boundary and the camera. No
   * scaled group's extent grows by more, so a group inside the boundary at the file count stays
   * inside the scaled boundary.
   */
  linearScale: number;
}

/** The boundary grows with the scaled groups; a slab's depth is physical (a few diameters) and stays. */
export function scaleBoundary<T extends Pick<SimulationSettings, 'boundarySize'>>(settings: T, linearScale: number): T {
  return { ...settings, boundarySize: settings.boundarySize * linearScale };
}

/**
 * Where a scene extends: in space, in the 2D plane (z is projected away) or in a slab box, whose
 * thickness (boundaryDepth) is physical. The last two grow in x and y only.
 */
type Extent = 'space' | 'plane' | 'slab';

const defaultTotal = (groups: readonly ParticleGroup[]) => groups.reduce((sum, g) => sum + g.count, 0);

/**
 * Scales a shape so its density stays constant when it holds `factor` times more particles;
 * `linear` is how much its extent grows.
 */
function scaleShape(shape: Shape, factor: number, extent: Extent, path: string): { shape: Shape; linear: number } {
  switch (shape.type) {
    case 'point':
      return { shape, linear: 1 };
    case 'sphere':
    case 'shell': {
      if (extent === 'slab' && factor > 1) {
        throw new Error(`${path}: a ${shape.type} cannot grow in a slab box, whose depth (boundaryDepth) never scales; use a disk with a thickness, a box or a grid, or "scale": false`);
      }
      // A ball fills a volume (a disk once projected in 2D); a shell is a surface.
      const linear = shape.type === 'sphere' && extent === 'space' ? Math.cbrt(factor) : Math.sqrt(factor);
      return { shape: { ...shape, radius: shape.radius * linear }, linear };
    }
    case 'disk': {
      const linear = Math.sqrt(factor);
      return { shape: { ...shape, radius: shape.radius * linear, innerRadius: shape.innerRadius * linear }, linear };
    }
    case 'box': {
      const growing = shape.size.map((s, k) => s > 0 && (k < 2 || extent === 'space'));
      const dimensions = growing.filter(Boolean).length;
      const linear = dimensions === 0 ? 1 : factor ** (1 / dimensions);
      return { shape: { ...shape, size: shape.size.map((s, k) => (growing[k] ? s * linear : s)) as typeof shape.size }, linear };
    }
    case 'grid': {
      // Axes with more than one site grow; a single-site grid grows in the plane.
      const sites = [shape.columns, shape.rows, shape.layers];
      const growing = [shape.columns > 1, shape.rows > 1, extent === 'space' && shape.layers > 1];
      if (!growing.some(Boolean)) growing.splice(0, 3, true, true, false);
      const root = factor ** (1 / growing.filter(Boolean).length);
      const [columns, rows, layers] = sites.map((n, k) => (growing[k] ? Math.max(1, Math.ceil(n * root)) : n)) as [number, number, number];
      // The spacing is fixed, so the outer sites, (n − 1)·spacing apart, move out by (n′ − 1)/(n − 1):
      // more than the root, and more again after rounding up. A single site grows to n′ cells.
      const spans = [columns, rows, layers].flatMap((m, k) => (growing[k] ? [sites[k]! > 1 ? (m - 1) / (sites[k]! - 1) : m] : []));
      return { shape: { ...shape, columns, rows, layers }, linear: Math.max(...spans) };
    }
  }
}

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

/**
 * Rescales the groups of a scenario to about `targetCount` particles at constant density: groups
 * marked `scale: false` keep their count, the others share the rest proportionally (rounded to
 * whole clusters) and their shapes grow by the matching root of the factor, in x and y only in
 * 2D or in a slab box.
 */
export function scaleGroups(
  groups: readonly ParticleGroup[],
  targetCount: number | undefined,
  settings: Pick<SimulationSettings, 'mode2D' | 'boundary' | 'boundaryDepth'>,
): ScaledGroups {
  const total = defaultTotal(groups);
  if (targetCount === undefined || targetCount === total) return { groups: [...groups], linearScale: 1 };
  if (!Number.isInteger(targetCount) || targetCount < 1) throw new Error(`particle count must be an integer >= 1, got ${targetCount}`);
  const pinned = groups.filter((g) => !g.scale).reduce((sum, g) => sum + g.count, 0);
  const scalable = total - pinned;
  if (scalable === 0) return { groups: [...groups], linearScale: 1 };
  if (targetCount <= pinned) {
    throw new Error(`particle count ${targetCount} leaves no room: ${pinned} particles are pinned with "scale": false`);
  }
  const extent: Extent = settings.mode2D ? 'plane' : isPlanar(settings) ? 'slab' : 'space';
  const factor = (targetCount - pinned) / scalable;
  let linearScale = 1;
  const scaled = groups.map((group, k) => {
    if (!group.scale) return group;
    const size = group.cluster?.size ?? 1;
    const step = countStep(group);
    // Rounded down, so the total never exceeds the target (nor, at the maximum, the capacity), except
    // that every scaled group keeps at least one cycle; the epsilon keeps an exact multiple from losing
    // a step to floating-point error.
    const count = Math.max(step, Math.floor((group.count * factor) / step + 1e-9) * step);
    const { shape, linear } = scaleShape(group.shape, count / group.count, extent, `groups[${k}]`);
    linearScale = Math.max(linearScale, linear);
    if (shape.type === 'grid' && shape.columns * shape.rows * shape.layers < count / size) {
      throw new Error(`scaled grid of ${shape.columns}×${shape.rows}×${shape.layers} sites cannot hold ${count / size} groups`);
    }
    return { ...group, count, shape };
  });
  return { groups: scaled, linearScale };
}
