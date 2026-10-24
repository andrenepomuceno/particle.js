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

## Result

Done. A potential reading dx/dy/dz/si_r/sj_r compiles as a vector force: shader-autodiff program
with variables dx, dy, dz, derived r (softened) and spin projections, F = −∇V emitted as a vec3
GLSL function added straight to the force (cutoff and contact-radius clamp as central forces), JS
for the CPU reference/field/energy through one addPairForce helper, the plot showing the radial part.
Spin dipole preset is now the true potential. Tests: exact gradient vs central differences,
isotropic V(Δx) equals the central force (ε = 0; with softening a vector force is Plummer-exact,
a central one applies −V'(r_soft) — documented), third law, momentum/energy conservation in a
3-body Verlet run; parity case on the GPU (2.4e-7 vs 0.76 displacement caused by the force).
Scenarios: Dipole Chains, Dipole Crystal.
Open question for later: central potential-mode forces with softening are not exact gradients
(−V'(r_soft) along r̂); switching them to the Plummer gradient would make them conserve energy.
