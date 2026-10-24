import type { ForceDefinition } from './types';

type Preset = Omit<ForceDefinition, 'id' | 'enabled'>;

export const FORCE_PRESETS = {
  gravity: {
    name: 'Gravity',
    mode: 'force',
    expression: '-G * m_i * m_j / r^2',
    range: 'long',
    cutoff: 1,
    softening: 1,
    params: [{ name: 'G', value: 1 }],
  },
  coulomb: {
    name: 'Coulomb',
    mode: 'force',
    expression: 'k * q_i * q_j / r^2',
    range: 'long',
    cutoff: 1,
    softening: 1,
    params: [{ name: 'k', value: 1 }],
  },
  nuclear: {
    name: 'Nuclear (v1 sine)',
    mode: 'force',
    expression: 'k * sin(2 * pi * x)',
    range: 'short',
    cutoff: 10,
    softening: 0,
    params: [{ name: 'k', value: 1 }],
  },
  lennardJones: {
    name: 'Lennard-Jones',
    mode: 'potential',
    expression: '4 * epsilon * ((sigma / r)^12 - (sigma / r)^6)',
    range: 'short',
    cutoff: 25,
    softening: 0,
    params: [{ name: 'epsilon', value: 1 }, { name: 'sigma', value: 10 }],
  },
  yukawa: {
    name: 'Yukawa',
    mode: 'potential',
    expression: '-g^2 * exp(-r / lambda) / r',
    range: 'short',
    cutoff: 50,
    softening: 1,
    params: [{ name: 'g', value: 1 }, { name: 'lambda', value: 10 }],
  },
  spring: {
    name: 'Spring',
    mode: 'potential',
    expression: '0.5 * k * (r - r0)^2',
    range: 'short',
    cutoff: 20,
    softening: 0,
    params: [{ name: 'k', value: 0.01 }, { name: 'r0', value: 10 }],
  },
  color: {
    name: 'Color (Cornell)',
    mode: 'potential',
    expression: 'alpha * c_dot / r + sigma * r',
    range: 'short',
    cutoff: 40,
    softening: 1,
    params: [{ name: 'alpha', value: 20 }, { name: 'sigma', value: 0.5 }],
  },
  spinSpin: {
    name: 'Spin-spin',
    mode: 'force',
    expression: 'k * s_i * s_j * p_i * p_j / r^4',
    range: 'short',
    cutoff: 20,
    softening: 1,
    params: [{ name: 'k', value: 100 }],
  },
} as const satisfies Record<string, Preset>;

export type ForcePresetId = keyof typeof FORCE_PRESETS;

// crypto.randomUUID is unavailable in insecure contexts (plain-http LAN hosting), which crashed v1.
export function newForceId(): string {
  return `force-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function forceFromPreset(id: ForcePresetId, overrides: Partial<ForceDefinition> = {}): ForceDefinition {
  const preset = FORCE_PRESETS[id];
  return {
    ...preset,
    params: preset.params.map((p) => ({ ...p })),
    id: newForceId(),
    enabled: true,
    ...overrides,
  };
}

export function withParams(force: ForceDefinition, values: Record<string, number>): ForceDefinition {
  for (const name of Object.keys(values)) {
    if (!force.params.some((p) => p.name === name)) {
      throw new Error(`force '${force.name}' has no parameter '${name}'`);
    }
  }
  return { ...force, params: force.params.map((p) => ({ ...p, value: values[p.name] ?? p.value })) };
}
