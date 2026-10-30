# Changelog

## Unreleased

- Expressions read the configured speed of light as `c_light`; new preset *Magnetic* (Biot–Savart with
  μ₀/4π = k/c²). *Neutral plasma* now has the full electromagnetic force (Coulomb + Magnetic) under the
  Minkowski metric with c = 20, instead of a speed clamp.
- Trail of the inspected particle (K, or *Trail* in the Particle dialog): its last 1000 steps as a line
  that fades with age.
- Scenarios can show the force field on load (`view.field`, with grid columns, log scale and test
  particle); *Hydrogen*, *Helium* and *Water* (Elements) now show their electric field.
- Fix: a particle total at the maximum (65536) no longer fails for scenarios whose counts rounded up
  past it; scaled counts now round down to whole cycles, so the total never exceeds the one requested.
- Information has a *JSON* tab: the current scenario's file as text. Edit it and *Apply (reset)* to
  restart with other initial conditions (validated like an imported file; R restarts the edit),
  *Revert* to the file as loaded, or *Download* it.
- Information has a *Scenarios* tab: the library in collapsible folders (or a flat list), ordered
  `suggested` (default), by `name` or `newest` first. The Overview select and PageDown/PageUp/Home follow it.
  Scenario files gain an optional `added` date.
- Special relativity: a **Spacetime** dialog switches the metric from Galilean (classical, the
  default) to Minkowski with a chosen speed of light c (`metric` and `lightSpeed` settings).
  Forces change the momentum γmv, so speeds stay below c without a clamp. Each clock shows its
  proper time dτ = dt/γ. Kinetic energy is (γ − 1)mc². Interactions stay instantaneous.
  Expressions still see v = dx/dt, so the existing Lorentz forces are relativistic as written.
- New color mode `clock` (the spread of particle clocks); the Particle dialog shows γ under Minkowski.
- New scenarios in *Relativity*: *Twin Clocks* and *Relativistic Cyclotron*.
- Snapshots are version 6 (adds `metric` and `lightSpeed`); versions 1–5 load as Galilean.
- Fix: a random velocity's `speed` given as `{ "cycle": [...] }` now cycles per particle (every
  particle used to get the first value).
- Statistics has a Particles tab: particles grouped by their properties (kind, mass, charges, spin,
  isospin, parity, nuclear and color charge), largest group first, with the matching species.
- Scaling a scenario to a particle total keeps every particle inside the boundary: the boundary
  follows a grid's outer sites (not just the ideal root of the count factor), a box in a slab keeps
  its thickness, and a sphere or shell in a slab fails loudly instead of growing through it.
  *Dipole Crystal* started 45 particles outside its box (26 columns now, same count and box).
- Random numbers in force expressions: `rand` (uniform in [0, 1)), `randn` (standard normal) and
  `randv` (vector of three normals), new for every pair at every step. A hash of the pair, the
  float32 time and a stream makes them deterministic, bit-identical on GPU and CPU and the same for
  both particles, so a central noise such as `sigma * randn` conserves momentum (DPD). Force mode
  only; field probes and plots use the mean. New scenario *DPD Thermostat*.

## 2.1.1 — 2026-10-24

- Describes particle.js as a classical, non-relativistic n-body particle physics simulator.

## 2.1.0 — 2026-10-24

- The boundary is drawn (sphere or box lines; E or Parameters toggles it).
- Slab boxes: `boundaryDepth` sets the box half-size in z (semi-2D worlds); new scenario
  *Crystal in a Slab*.
- Snapshots are version 5 (adds `quadraticDrag` and `boundaryDepth`); versions 1–4 still load.

## 2.0.0 — 2026-10-24

First stable release of particle.js v2. Changes since 2.0.0-rc.1:

- The classic v1 stays available, frozen, at `/v1/` (linked from About).
- Vectors and velocity in expressions: `d`, `rhat`, `s_i`, `v_i`, `vec`, `cross`, `dot`, `length`,
  `normalize`, `v_dot`, `v_rel`, `vv_dot`. A vector force-mode expression is applied as the force
  (Lorentz, dipole fields, Biot–Savart); forces reading v_i use an implicit-midpoint velocity step
  (exact Boris rotation for v × B). New scenarios: *Radiation Belt*, *Cyclotron and E×B Drift*,
  *Beam Pinch*. Breaking: `s_i`/`s_j` are now spin vectors (`s_i * s_j` → `dot(s_i, s_j)` or `s_dot`).
- Softened potentials: the force is now the exact gradient of the softened V, `−V'(r)·d/r`
  (Plummer), so potential-mode forces conserve energy even inside ε. Force mode is unchanged;
  scenarios with softened potentials move slightly differently at close range.
- Forces dialog: resultant potential of the enabled forces, short and long range plotted apart, with
  an editable sample pair and range; cards start collapsed and remember what was expanded.
- About: *Quick guide* tab.
- Restore buttons: scenario settings and forces, Generator defaults, default test particle.
- Field dialog: *Lock color scale*, so a scaled test particle shows as a stronger or weaker field.
- Vector forces: a potential reading `dx`, `dy`, `dz`, `si_r` or `sj_r` yields the full force
  −∇V (non-central). The Spin dipole preset is now the true dipole–dipole potential. New scenarios
  *Dipole Chains* (2D ferrofluid chains) and *Dipole Crystal* (triangular lattice with defects).
  Breaking: `dx`, `dy`, `dz` are now variables, so force parameters with those names must be renamed.
- Forces compile through [shader-autodiff](https://github.com/andrenepomuceno/shader-autodiff): one
  graph per force emits the GLSL and the JS reference, with exact `−dV/dr` and shared subexpressions
  computed once (7–17% more steps/s at 16k particles on an RTX 5060 Ti).
- Scenario `timeline`: v1's scripted actions as data — set or multiply force parameters and
  settings at given simulation times, captions with live values, camera transitions. The Egg runs
  v1's script.
- Expressions reference dialog; collapsible force cards.
- Zooming far out no longer hides the particles: the camera's near/far planes follow the orbit
  distance (the far plane was fixed at 1e6), and spherow particles only a few pixels wide are drawn
  as discs, as in v1 (the raymarched sphere missed every pixel center).
- Browser scripts run on the real GPU (fail on a software renderer); SwiftShader only on CI.

## 2.0.0-rc.1

First release candidate of particle.js v2, a from-scratch rewrite of
[v1](https://github.com/andrenepomuceno/particle.js).

### Engine

- User-defined forces: any number of pair forces, each an expression compiled to GLSL and
  evaluated for every particle pair on the GPU (v1 had one hard-coded potential per `#define`).
- Force or potential mode: write `F(r)` or `V(r)` and get `F = -dV/dr` by symbolic differentiation.
- Short range (hard cutoff) or long range forces, with softening.
- Expression parameters, cutoff and softening are uniforms: changing a value does not recompile.
  Changing an expression is validated before the new shader replaces the old one.
- Velocity Verlet integrator (default) and semi-implicit Euler.
- A float64 CPU reference step and a GPU-vs-reference parity script.
- GPU potential-energy pass.

### Particles and physics

- Per-particle position, velocity, own clock, mass, charge, spin, parity, nuclear charge and
  color charge, all usable in expressions.
- Color charge modeled with three base vectors 120 degrees apart.
- 2D and 3D modes, sphere or box boundaries, friction, optional speed clamp.

### Interface

- v1-style interaction: keyboard shortcuts, draggable dialogs, click to inspect and edit,
  shift+drag to select, copy and place groups, particle generator.
- Force editor with inline errors and a live plot of each force as the integrator applies it.
- Statistics dialog: energy, speed, temperature and performance charts.
- v1-style rendering: spheres with a velocity arrow, colored by charge, color charge or speed; FPS limit.
- Plain CSS components, no MUI.

### Scenarios and snapshots

- Scenarios are JSON files: Galaxy disk, Neutral plasma, Nuclear clusters, Lennard-Jones
  crystal, Color confinement, Quarks to nuclei, Sandbox.
- Snapshots export the full state to JSON plus a PNG and import it back with field-by-field
  validation (snapshot version 2).

### Tooling

- Vite, React, TypeScript and three.js; Vitest unit tests.
- Headless Chromium scripts: parity, scenario snapshots and an interaction smoke test.
- GitHub Actions workflows for CI and GitHub Pages deploy.
