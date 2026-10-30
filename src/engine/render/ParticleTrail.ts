import { BufferAttribute, BufferGeometry, Line, LineBasicMaterial } from 'three';
import type { Vec3 } from '../particles';

/** Steps of history the trail keeps (about 17 s at 60 steps per second). */
export const TRAIL_LENGTH = 1000;

const HEAD_COLOR = [0.55, 0.8, 1];
/** Brightness of the oldest point; the newest is 1. */
const TAIL_BRIGHTNESS = 0.08;

/** The recent path of one particle as a line that fades with age (oldest dim, newest bright). */
export class ParticleTrail {
  readonly object: Line;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly geometry = new BufferGeometry();
  private readonly material = new LineBasicMaterial({ vertexColors: true });
  private count = 0;

  constructor(readonly capacity = TRAIL_LENGTH) {
    if (!Number.isInteger(capacity) || capacity < 2) throw new Error(`trail capacity must be an integer >= 2, got ${capacity}`);
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new BufferAttribute(this.colors, 3));
    this.object = new Line(this.geometry, this.material);
    this.object.frustumCulled = false;
    this.clear();
  }

  get length(): number {
    return this.count;
  }

  /** Appends the newest position; once full, the oldest one drops off. */
  push(position: Vec3): void {
    if (this.count === this.capacity) this.positions.copyWithin(0, 3);
    else this.count++;
    this.positions.set(position, (this.count - 1) * 3);
    this.recolor();
    this.geometry.attributes.position!.needsUpdate = true;
    this.geometry.setDrawRange(0, this.count);
  }

  /** Points oldest first, as drawn. */
  points(): Vec3[] {
    return Array.from({ length: this.count }, (_, k) => [this.positions[k * 3]!, this.positions[k * 3 + 1]!, this.positions[k * 3 + 2]!]);
  }

  clear(): void {
    this.count = 0;
    this.geometry.setDrawRange(0, 0);
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  // The fade depends on each point's age, which shifts by one with every push.
  private recolor(): void {
    for (let k = 0; k < this.count; k++) {
      const age = this.count === 1 ? 1 : k / (this.count - 1);
      const brightness = TAIL_BRIGHTNESS + (1 - TAIL_BRIGHTNESS) * age;
      for (let c = 0; c < 3; c++) this.colors[k * 3 + c] = HEAD_COLOR[c]! * brightness;
    }
    this.geometry.attributes.color!.needsUpdate = true;
  }
}
