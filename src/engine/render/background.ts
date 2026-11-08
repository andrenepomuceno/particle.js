import { CanvasTexture, SRGBColorSpace } from 'three';

/** A radial background: `center` in the middle of the view fading to `edge` at its corners. */
export interface RadialBackground {
  center: string;
  edge: string;
}

const SIZE = 512;

/** The gradient as a texture the scene stretches over the view (so it follows the view's aspect). */
export function radialBackgroundTexture({ center, edge }: RadialBackground): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('a 2D canvas is needed to draw the background gradient');
  const gradient = context.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, (SIZE / 2) * Math.SQRT2);
  gradient.addColorStop(0, center);
  gradient.addColorStop(1, edge);
  context.fillStyle = gradient;
  context.fillRect(0, 0, SIZE, SIZE);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
