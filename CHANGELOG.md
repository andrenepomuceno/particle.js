# Changelog

## Unreleased

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
