# Velocity-dependent variables in expressions

Expose relative velocity (`v_rel`, `v_dot` = (v_i - v_j)·r̂) so drag-like or
magnetic-like pair forces can be written. Potential mode must reject them, since
F = -dV/dr only holds for position-dependent V.

## Decision (2026-10-24)

Arbitrary L(x, v) is out (Euler–Lagrange brings d/dt ∂U/∂v, an implicit N×N solve). In scope: a
generalized potential linear in velocity, U = V − v·A(Δx) (electromagnetism's form), giving
Lorentz-like forces q(E + v×B) explicitly; needs a velocity-aware integrator (Boris push) since
Verlet is no longer symplectic with v-dependent forces. After the shader-autodiff vector forces.

## Result

Done as vector expressions in force mode (user choice: no separate magnetic mode). lowerVectors
type-checks and lowers d, rhat, s_i/s_j, v_i/v_j, vec/cross/dot/length/normalize and the shorthands
v_dot, v_rel, vv_dot; a vector (or v_i-reading) force-mode expression compiles with v_i as the
shader-autodiff variable, emitting F and ∂F/∂v_i; the Euler velocity pass (and the CPU reference)
apply (I − dt/2m·J)Δv = dt/m·F — Boris-exact for v × B. Verlet falls back to it with a warning.
Tests: Jacobian vs finite differences, closed cyclotron orbit with |v| preserved, Boris kick,
Biot–Savart sign; GPU parity case (6e-7 vs 3.06 displacement). Scenarios: Radiation Belt,
Cyclotron and E×B Drift, Beam Pinch (checked on the GPU).
