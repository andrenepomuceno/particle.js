/**
 * Scalar spin became a vector (snapshot v4, scenario v2): the old s_i/s_j are its z components.
 * Applied to raw JSON before validation, so files written earlier keep loading.
 */
export function migrateScalarSpin(force: unknown): unknown {
  if (typeof force !== 'object' || force === null) return force;
  const expression = (force as { expression?: unknown }).expression;
  if (typeof expression !== 'string') return force;
  return { ...force, expression: expression.replace(/\bs_i\b/g, 'sz_i').replace(/\bs_j\b/g, 'sz_j') };
}
