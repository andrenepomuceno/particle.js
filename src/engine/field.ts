import type { Vec3 } from './particles';

/** Attributes of the test particle whose net force the field shows. Its clock is always 0. */
export interface FieldProbe {
  mass: number;
  charge: number;
  spin: number;
  parity: number;
  nuclearCharge: number;
  color: Vec3;
}

export const DEFAULT_PROBE: FieldProbe = { mass: 1, charge: 1, spin: 0, parity: 1, nuclearCharge: 0, color: [0, 0, 0] };

export const FIELD_COLUMNS_MIN = 2;
export const FIELD_COLUMNS_MAX = 256;

/** Quantile of the probe magnitudes that maps to the top of the palette (white beyond it). */
export const FIELD_REFERENCE_QUANTILE = 0.9;

export function validateProbe(probe: FieldProbe): string[] {
  const problems: string[] = [];
  const entries: [string, number][] = [
    ['mass', probe.mass], ['charge', probe.charge], ['spin', probe.spin], ['parity', probe.parity],
    ['nuclearCharge', probe.nuclearCharge], ...probe.color.map((c, k): [string, number] => [`color[${k}]`, c]),
  ];
  for (const [name, value] of entries) {
    if (!Number.isFinite(value)) problems.push(`test particle ${name} must be finite, got ${value}`);
  }
  if (!(probe.mass > 0)) problems.push(`test particle mass must be > 0, got ${probe.mass}`);
  return problems;
}

export function validateColumns(columns: number): string | undefined {
  return Number.isInteger(columns) && columns >= FIELD_COLUMNS_MIN && columns <= FIELD_COLUMNS_MAX
    ? undefined
    : `field grid columns must be an integer in [${FIELD_COLUMNS_MIN}, ${FIELD_COLUMNS_MAX}], got ${columns}`;
}

/** Camera state needed to place the grid; `direction` and `right` are unit vectors. */
export interface CameraPose {
  position: Vec3;
  target: Vec3;
  direction: Vec3;
  right: Vec3;
  fovDegrees: number;
  aspect: number;
}

/** A rectangle in world space: center plus orthonormal in-plane axes and half extents. */
export interface FieldView {
  center: Vec3;
  right: Vec3;
  up: Vec3;
  halfWidth: number;
  halfHeight: number;
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

function normalize(a: Vec3): Vec3 | undefined {
  const length = Math.hypot(...a);
  return length > 1e-9 ? scale(a, 1 / length) : undefined;
}

/**
 * The visible part of the plane the field is drawn on: z = 0 in 2D, otherwise the plane
 * through the orbit target facing the camera (the same plane particles are placed on).
 */
export function fieldView(pose: CameraPose, mode2D: boolean): FieldView {
  const normal: Vec3 = mode2D ? [0, 0, 1] : scale(pose.direction, -1);
  const center: Vec3 = mode2D ? [pose.target[0], pose.target[1], 0] : [...pose.target];
  const right = normalize(sub(pose.right, scale(normal, dot(pose.right, normal)))) ?? [1, 0, 0];
  const up = cross(normal, right);
  const depth = Math.abs(dot(sub(center, pose.position), pose.direction));
  const halfHeight = depth * Math.tan((pose.fovDegrees * Math.PI) / 360);
  if (!(halfHeight > 0)) throw new Error(`camera sits on the field plane (depth ${depth}); move it away to fit the grid`);
  return { center, right, up, halfWidth: halfHeight * pose.aspect, halfHeight };
}

export interface FieldGrid {
  /** xyz per probe, row-major from the bottom-left cell. */
  positions: Float32Array;
  count: number;
  columns: number;
  rows: number;
  /** Distance between neighboring probes. */
  spacing: number;
}

/** Square cells filling the view, `columns` across; probes sit at the cell centers. */
export function fieldGrid(view: FieldView, columns: number): FieldGrid {
  const problem = validateColumns(columns);
  if (problem) throw new Error(problem);
  const spacing = (2 * view.halfWidth) / columns;
  const rows = Math.max(1, Math.round((2 * view.halfHeight) / spacing));
  const count = columns * rows;
  const positions = new Float32Array(count * 3);
  for (let row = 0; row < rows; row++) {
    const v = (row + 0.5 - rows / 2) * spacing;
    for (let column = 0; column < columns; column++) {
      const u = (column + 0.5 - columns / 2) * spacing;
      const o = (row * columns + column) * 3;
      for (let k = 0; k < 3; k++) positions[o + k] = view.center[k]! + u * view.right[k]! + v * view.up[k]!;
    }
  }
  return { positions, count, columns, rows, spacing };
}

/**
 * Field strength mapped to the top of the arrow palette. A quantile instead of v1's
 * 16× mean: probes next to a particle see a 1/r² spike that would dominate a mean.
 * Returns 0 when no probe feels a finite, non-zero force.
 */
export function fieldReference(magnitudes: ArrayLike<number>, quantile = FIELD_REFERENCE_QUANTILE): number {
  const values: number[] = [];
  for (let k = 0; k < magnitudes.length; k++) {
    const m = magnitudes[k]!;
    if (Number.isFinite(m) && m > 0) values.push(m);
  }
  if (values.length === 0) return 0;
  values.sort((a, b) => a - b);
  return values[Math.min(values.length - 1, Math.floor(quantile * values.length))]!;
}
