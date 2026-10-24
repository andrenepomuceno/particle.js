import type { ForceDefinition } from '../src/engine/forces/types';

export function makeForce(overrides: Partial<ForceDefinition> = {}): ForceDefinition {
  return {
    id: 'f',
    name: 'test',
    enabled: true,
    mode: 'force',
    expression: 'k * q_i * q_j / r^2',
    range: 'long',
    cutoff: 1,
    softening: 0,
    params: [{ name: 'k', value: 2 }],
    ...overrides,
  };
}
