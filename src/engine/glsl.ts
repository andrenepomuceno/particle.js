/** A GLSL float literal with the exact value: String keeps every digit, whole numbers get their '.0'. */
export function glslFloat(value: number): string {
  if (!Number.isFinite(value)) throw new Error(`a GLSL constant must be finite, got ${value}`);
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}
