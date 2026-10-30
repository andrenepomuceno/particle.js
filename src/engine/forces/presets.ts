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
    expression: 'k * q_dot / r^2',
    range: 'long',
    cutoff: 1,
    softening: 1,
    params: [{ name: 'k', value: 1 }],
  },
  magnetic: {
    name: 'Magnetic (Biot–Savart)',
    mode: 'force',
    // μ₀/4π = k/c²: the magnetic partner of a Coulomb force with the same k, between moving charges.
    expression: 'k * q_i * q_j / (c_light^2 * r^3) * cross(v_i, cross(v_j, d))',
    range: 'long',
    cutoff: 1,
    softening: 1,
    params: [{ name: 'k', value: 1 }],
  },
  lienardWiechert: {
    name: 'Liénard–Wiechert (E + B)',
    mode: 'force',
    // The retarded fields of j (n = rhat from its retarded position, β = v_j/c, κ = 1 − n·β): velocity field
    // k·q_j·(n − β)(1 − β²)/(κ³R²) plus radiation k·q_j·n × ((n − β) × a_j/c)/(c·κ³R), B = n × E / c, on q_i.
    expression: 'q_i * ((k * q_j * ((rhat - v_j / c_light) * (1 - dot(v_j, v_j) / c_light^2) / ((1 - dot(rhat, v_j) / c_light)^3 * r^2) + cross(rhat, cross(rhat - v_j / c_light, a_j / c_light)) / (c_light * (1 - dot(rhat, v_j) / c_light)^3 * r))) + cross(v_i / c_light, cross(rhat, k * q_j * ((rhat - v_j / c_light) * (1 - dot(v_j, v_j) / c_light^2) / ((1 - dot(rhat, v_j) / c_light)^3 * r^2) + cross(rhat, cross(rhat - v_j / c_light, a_j / c_light)) / (c_light * (1 - dot(rhat, v_j) / c_light)^3 * r)))))',
    range: 'long',
    cutoff: 1,
    softening: 1,
    params: [{ name: 'k', value: 1 }],
    retarded: true,
  },
  nuclear: {
    name: 'Nuclear (v1 sine)',
    mode: 'force',
    expression: 'k * n_i * n_j * sin(2 * pi * x)',
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
    expression: 'c_dot * (alpha / r - sigma * r)',
    range: 'short',
    cutoff: 40,
    softening: 1,
    params: [{ name: 'alpha', value: 20 }, { name: 'sigma', value: 0.5 }],
  },
  spinSpin: {
    // Magnetic dipole-dipole energy of the (fixed) spins; potential mode makes the force the full,
    // non-central −∇V. Spins do not turn: the torque on them is not modelled.
    name: 'Spin dipole',
    mode: 'potential',
    expression: 'k * (s_dot - 3 * si_r * sj_r) / r^3',
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
