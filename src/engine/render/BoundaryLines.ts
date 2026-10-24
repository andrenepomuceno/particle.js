import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments } from 'three';
import { boxHalfSize, type SimulationSettings } from '../settings';

const CIRCLE_SEGMENTS = 96;

/** Segment endpoints of a circle of radius r in the plane spanned by axes a and b (0 = x, 1 = y, 2 = z). */
function circle(r: number, a: number, b: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < CIRCLE_SEGMENTS; k++) {
    for (const t of [k, k + 1].map((s) => (2 * Math.PI * s) / CIRCLE_SEGMENTS)) {
      const p = [0, 0, 0];
      p[a] = r * Math.cos(t);
      p[b] = r * Math.sin(t);
      out.push(...p);
    }
  }
  return out;
}

/** The twelve edges of a box with half-sizes h (in 2D only the four of the z = 0 rectangle). */
function box([hx, hy, hz]: [number, number, number], flat: boolean): number[] {
  const corners = (z: number) => [[-hx, -hy, z], [hx, -hy, z], [hx, hy, z], [-hx, hy, z]];
  const ring = (z: number) => corners(z).flatMap((c, k, all) => [...c, ...all[(k + 1) % 4]!]);
  if (flat) return ring(0);
  return [...ring(-hz), ...ring(hz), ...corners(-hz).flatMap((c) => [...c, c[0]!, c[1]!, hz])];
}

/** The simulation boundary drawn as lines: sphere (three great circles, a circle in 2D) or box. */
export class BoundaryLines {
  readonly object: LineSegments;
  private readonly material = new LineBasicMaterial({ color: 0x5b6b82, transparent: true, opacity: 0.7 });

  constructor() {
    this.object = new LineSegments(new BufferGeometry(), this.material);
    this.object.frustumCulled = false;
  }

  /** Rebuilds the lines for the boundary in `settings` (nothing when there is none). */
  update(settings: Pick<SimulationSettings, 'boundary' | 'boundarySize' | 'boundaryDepth' | 'mode2D'>): void {
    const r = settings.boundarySize;
    const points = settings.boundary === 'sphere'
      ? (settings.mode2D ? circle(r, 0, 1) : [...circle(r, 0, 1), ...circle(r, 0, 2), ...circle(r, 1, 2)])
      : settings.boundary === 'box' ? box(boxHalfSize(settings), settings.mode2D) : [];
    this.object.geometry.dispose();
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
    this.object.geometry = geometry;
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  dispose(): void {
    this.object.geometry.dispose();
    this.material.dispose();
  }
}
