# Elastic collisions (parameterized)

User decision (2026-10-24): add v1's collision as a dedicated, parameterized elastic step.

v1: below a minimum distance d_min the pair exchanged momentum along the line of centers
(computeShader.glsl.js `collision`), with a per-scenario "Collision Distance" and a counter.
v2 plan:
- Settings: `collisionDistance` (0 = off) and `collisionRestitution` e ∈ [0, 1] (1 = elastic).
- In the velocity pass, for pairs closer than d_min and approaching, apply the impulse
  Δv_i = -(1 + e)·m_j/(m_i + m_j)·((v_i − v_j)·n̂)·n̂; pairs inside d_min skip the force terms
  (as v1 did) so 1/r² does not explode. Mirror it in referenceStep; parity + momentum/energy tests
  (momentum conserved; KE conserved for e = 1, reduced otherwise).
- Collision counter in Information/Statistics; scenario/snapshot settings keys; docs.

## Result

Done. Settings collisionDistance (0 = off) and collisionRestitution; GLSL collisionImpulse in the
Euler and Verlet velocity passes; colliding pairs skip forces; CPU mirror in referenceStep.
Verified: 8 unit tests (elastic swap, inelastic common velocity, momentum and kinetic energy,
separating pairs untouched) for both integrators; GPU parity 9.0e-5 / 9.2e-5. Not done: a
collision counter (v1 showed one), since it needs a GPU reduction or extra readback.
