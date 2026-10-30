import type { Vec3 } from './particles';
import type { SimulationSettings } from './settings';

/*
 * Kinematics under the spacetime metric, shared by the CPU reference, the ParticleSet and the GPU.
 *
 * Galilean: the velocity textures hold v = dx/dt, forces give dv/dt = F/m and every clock advances by dt.
 * Minkowski (dτ² = dt² − |dx|²/c²): they hold the proper velocity u = dx/dτ = γv. Forces change the
 * momentum p = m·u, du/dt = F/m. Particles drift with v = u/γ, where γ = √(1 + |u|²/c²), and each
 * clock advances by its proper time dτ = dt/γ. Everything below takes k = 1/c², which is 0 for
 * Galilean. Then γ = 1 and u = v exactly.
 */

/** k = 1/c² of the settings' metric; 0 for Galilean. */
export function inverseLightSpeed2(settings: Pick<SimulationSettings, 'metric' | 'lightSpeed'>): number {
  return settings.metric === 'minkowski' ? 1 / settings.lightSpeed ** 2 : 0;
}

/** γ = √(1 + |u|²·k) of a stored velocity u; exactly 1 when Galilean. */
export function lorentzFactor(u: ArrayLike<number>, k: number): number {
  return k > 0 ? Math.sqrt(1 + (u[0]! ** 2 + u[1]! ** 2 + u[2]! ** 2) * k) : 1;
}

/** v = u/γ: the velocity dx/dt that expressions, the drift and the UI see. */
export function coordinateVelocity(u: ArrayLike<number>, k: number): Vec3 {
  const gamma = lorentzFactor(u, k);
  return [u[0]! / gamma, u[1]! / gamma, u[2]! / gamma];
}

/** u = γv for a coordinate velocity v; throws when |v| reaches c, where no proper velocity exists. */
export function properVelocity(v: ArrayLike<number>, k: number): Vec3 {
  if (k === 0) return [v[0]!, v[1]!, v[2]!];
  const beta2 = (v[0]! ** 2 + v[1]! ** 2 + v[2]! ** 2) * k;
  if (!(beta2 < 1)) throw new Error(`speed ${Math.hypot(v[0]!, v[1]!, v[2]!)} reaches the speed of light c = ${1 / Math.sqrt(k)}`);
  const gamma = 1 / Math.sqrt(1 - beta2);
  return [v[0]! * gamma, v[1]! * gamma, v[2]! * gamma];
}

/**
 * ∂v/∂u = (I − v·vᵀ/c²)/γ, row-major. The implicit kick linearizes F(v(u)), so the force's
 * ∂F/∂v is multiplied by this to get ∂F/∂u.
 */
export function velocityJacobian(u: ArrayLike<number>, k: number): number[] {
  const gamma = lorentzFactor(u, k);
  const v = [u[0]! / gamma, u[1]! / gamma, u[2]! / gamma];
  return [0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => ((row === col ? 1 : 0) - k * v[row]! * v[col]!) / gamma));
}

/**
 * Kinetic energy (γ − 1)·m·c², written m·|u|²/(γ + 1): no cancellation at low speed, and exactly
 * ½·m·v² when Galilean.
 */
export function kineticEnergy(mass: number, u: ArrayLike<number>, k: number): number {
  return (mass * (u[0]! ** 2 + u[1]! ** 2 + u[2]! ** 2)) / (lorentzFactor(u, k) + 1);
}

/**
 * GLSL twins of the functions above (the compute passes and the particle renderer). The Galilean
 * branches return their inputs untouched, so k = 0 reproduces the classical passes bit for bit.
 */
export const GLSL_METRIC = /* glsl */ `
uniform float uInverseLightSpeed2;

float lorentzFactor(vec3 u) {
  return uInverseLightSpeed2 > 0.0 ? sqrt(1.0 + dot(u, u) * uInverseLightSpeed2) : 1.0;
}

vec3 coordinateVelocity(vec3 u) {
  return uInverseLightSpeed2 > 0.0 ? u / lorentzFactor(u) : u;
}

// ∂v/∂u = (I − v·vᵀ/c²)/γ: turns the force's ∂F/∂v into the ∂F/∂u the implicit kick needs.
mat3 velocityJacobian(vec3 u) {
  float gamma = lorentzFactor(u);
  vec3 v = u / gamma;
  return (mat3(1.0) - uInverseLightSpeed2 * outerProduct(v, v)) / gamma;
}
`;
