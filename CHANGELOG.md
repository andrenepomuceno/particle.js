# Changelog

## Unreleased

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
