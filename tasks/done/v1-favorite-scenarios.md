# Port the user's favorite v1 scenarios

User (2026-10-24) named the v1 scenarios they find good: The Egg, Gravity, Welcome, Experiments 4,
Hexagonal Crystal, Periodic Table, Super Nucleus 3D, Tetragonal Crystal, Standard Model 1,
Plasma Ball, Hexagon 1, 2 and 3, Terrarium, Wild particles.

Already ported: The Egg, Gravity, Welcome, Periodic Table, Standard Model (scripted parts wait for
`scenario-timeline.md`). To port: Experiments 4 (scripted, forceMap.js), Hexagonal Crystal,
Super Nucleus 3D, Tetragonal Crystal, Plasma Ball, Hexagon 1/2/3, Terrarium, Wild particles.
Check each against v1 visually on the GPU (snap) and with the scenario KPIs once they exist.

## Result

Ported the 12 remaining favorites (2026-10-24), each checked on the GPU with `npm run snap`, step-by-step
screenshots and `npm run kpis -- --steps 2000` (all finite, no console problems):

- Force Map: `63-experiments-4` (hand-written, v1's script as a timeline), `64-hexagonal-crystal-quarks`
  (v1's eight-step force map as parameters f0…f7). v1's quadratic friction is reproduced exactly as a
  velocity-dependent force from one fixed marker particle (`q2 = 1`); a linear drag of c/m was ~100×
  too weak at these speeds and left Experiments 4 hot.
- Experiments 1: `71-hexagonal-crystal`, `72-tetragonal-crystal` (generated per site), `78-super-nucleus-3d`,
  `79-plasma-ball`, `82-standard-model-1`.
- Experiments 0: `84-wild-particles`, `86/87/88-hexagon-1/2/3` (generated; v1's hexagonGenerator is
  replicated, fractional grid sizes and all), `89-terrarium`.
- Both Hexagonal Crystals kept: the force-map one is quark atoms under a step map with drag, the
  Experiments 1 one is v0 nuclei under powAX.

Deviations: v1's random force noise is not reproduced; v1's massless particles (unit inertia) get
mass 1; integer-rounded random masses/charges (Super Nucleus) are uniform; negligible gravity is omitted
where noted; Coulomb/gravity softening = v1's minimum distance (1 instead of 1e-3 in Experiments 4).
KPI flags left on purpose: the burst scenes start in a radius-1 ball/disk, so "escaped/runaway" is
measured against that tiny start; Hexagon 1's beam starts off-screen as in v1.
`scenario-kpis.mjs` now advances in batches of 10: one `advance(1000)` with a velocity force on 10k
particles tripped the GPU watchdog (context lost, white page).
