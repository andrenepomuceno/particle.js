# Vector forces from a potential of the relative position, V(Δx)

Follow-up of `adopt-shader-autodiff.md` (user decision 2026-10-24). Today a force is central: a
signed magnitude along r̂. With shader-autodiff's gradients, a potential written in the relative
position (dx, dy, dz) — plus spins and other pair variables — yields the full vector force
F_i = −∇_{Δx} V, so non-central interactions become expressible in potential mode: the spin dipole's
angular part, si_r/sj_r in potentials (rejected today), anisotropic bonds.

Plan:
- Expression variables dx, dy, dz (x_i − x_j); r stays available (derived sqrt(dx²+dy²+dz²+ε²)).
- compileForce: when a potential reads dx/dy/dz or directional variables, emit a vec3 gradient
  function; force loop accumulates a vec3 per pair instead of magnitude·r̂ for those forces.
- CPU reference, field probes and energy follow; parity cases for an anisotropic potential.
- Newton's third law holds for V(Δx) (gradient wrt Δx is antisymmetric in i↔j only if V(Δx) =
  V(−Δx) with swapped attributes) — document and test which forms conserve momentum.
