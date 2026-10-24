# Velocity-dependent variables in expressions

Expose relative velocity (`v_rel`, `v_dot` = (v_i - v_j)·r̂) so drag-like or
magnetic-like pair forces can be written. Potential mode must reject them, since
F = -dV/dr only holds for position-dependent V.

## Decision (2026-10-24)

Arbitrary L(x, v) is out (Euler–Lagrange brings d/dt ∂U/∂v, an implicit N×N solve). In scope: a
generalized potential linear in velocity, U = V − v·A(Δx) (electromagnetism's form), giving
Lorentz-like forces q(E + v×B) explicitly; needs a velocity-aware integrator (Boris push) since
Verlet is no longer symplectic with v-dependent forces. After the shader-autodiff vector forces.
