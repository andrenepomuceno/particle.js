# CLAUDE.md — particle.js

Guidance for Claude Code when working in this repository.

## Project

JavaScript 3D n-body particle simulator with GPU-accelerated interaction updates (gravity, electromagnetism, configurable short-range nuclear force). Plain JS + JSX with Babel — no TypeScript.

## Architecture

- Entry point: [src/main.js](src/main.js) → `viewSetup()` from [src/simulation/view.js](src/simulation/view.js) (wires input, GUI panels, `requestAnimationFrame` loop, `guiOptions` bridge).
- [src/simulation/core.js](src/simulation/core.js) is now a thin bootstrapper that constructs `GraphicsGPU` and delegates to `createSimulationRuntime()` in [src/simulation/runtime.js](src/simulation/runtime.js). It exports live bindings `simulation` and `core`; `simulation` is reassigned on scenario change via `onSimulationChange`, so always import it as a live binding.
- [src/simulation/runtime.js](src/simulation/runtime.js) — `CoreRuntime` class: scenario selector, `setup()`, `updatePhysics()`, particle creation routed through `updateFunctionMap` flags (`updateShader` / `fillPhysics`).
- [src/simulation/simulation.js](src/simulation/simulation.js) — `SimulationGPU`: owns `particleList`, per-frame `step(dt, time)`, delegates GPU work to `GraphicsGPU`.
- [src/simulation/graphics.js](src/simulation/graphics.js) — `GraphicsGPU`: three.js renderer + `GPUComputationRenderer`. A **single** instance is shared across scenario resets (only `cleanup()` + `drawParticles()` are called, not a new constructor).
- [src/simulation/field.js](src/simulation/field.js) — `FieldGPU`: injects probe particles for vector-field visualization; shares the particle list.
- Shaders are JS→GLSL: [src/simulation/shaders/computeShader.glsl.js](src/simulation/shaders/computeShader.glsl.js) builds velocity/position compute shaders; [src/simulation/shaders/particleShader.glsl.js](src/simulation/shaders/particleShader.glsl.js) builds rendering shaders. Both emit GLSL strings with `#define` flags derived from `Physics` properties.
- Scenarios: arrays of `{ name, callback }` composed in [src/simulation/scenarios.js](src/simulation/scenarios.js) via `addFolder()`. Two generations live side by side: [src/simulation/scenarios_v0](src/simulation/scenarios_v0) and [src/simulation/scenarios_v1](src/simulation/scenarios_v1). Callbacks receive `simulation`, configure `physics.*`, and populate `particleList` (often via helpers in [src/simulation/scenariosHelpers.js](src/simulation/scenariosHelpers.js)).
- Headless runtime: [src/simulation/headless/createHeadlessRuntime.js](src/simulation/headless/createHeadlessRuntime.js) + [src/simulation/headless/graphicsHeadless.js](src/simulation/headless/graphicsHeadless.js) provide a no-render GraphicsGPU stub for Node/browser headless tests.
- UI is two-layered:
  - React/MUI ([src/ui](src/ui)) — `UI` singleton in [src/ui/App.jsx](src/ui/App.jsx) owns dialog state and renders views. `useDialogView()` persists open/closed state in `localStorage`.
  - Simulation GUI ([src/simulation/gui](src/simulation/gui)) — classes like `GUIParameters`, `GUIControls` register items via `addUIOption()` from [src/simulation/gui/uiHelper.js](src/simulation/gui/uiHelper.js), which calls `UI.addItem()`. Input handlers live in [src/simulation/components](src/simulation/components).

## Key data flow

- **Scenario load**: `core.setup(idx)` → new `SimulationGPU(graphics, new Physics())` → `simulation.setup(particleSetup)` → scenario callback populates `simulation.physics.particleList` → `simulation.drawParticles()` rebuilds GPU textures.
- **Per-frame**: `SimulationGPU.step(dt, time)` → `graphics.compute(dt, time)` (GPU advances positions/velocities) → `graphics.render()`.
- **Physics → shader**: boolean physics flags map to `#define`s. Flag changes affecting shaders require `graphics.drawParticles(list, physics, shaderUpdate=true)`. Always route UI updates through `core.updatePhysics(key, value)`.
- **Max particles**: `ENV.maxParticles` (webpack `--env`) → `calcTextWidth()` → square texture width. Adjustable at runtime via `graphics.setMaxParticles()`.
- **GPU readback**: call `graphics.readbackParticleData()` before reading particle positions/velocities from JS (creating particles, exporting, etc.).

## Developer workflows

```
npm start                 # dev server, localhost:8080, 20k particles
npm run low               # 10k particles (weaker hardware)
npm run record            # 50k particles, port 8081, canvas-capture enabled
npm run build             # production bundle in dist/ (10k particles)
npm run headless:serve    # headless webpack dev server
npm run test:functional   # vitest run — Node headless lifecycle + contract tests
npm run test:perf         # playwright — Chromium headless GPU performance report
npm run test:headless     # functional + perf, sequential
npm run madge-simple      # dependency SVG → img/
```

Tests live in [tests/headless](tests/headless) ([functional.test.js](tests/headless/functional.test.js), [performance.spec.js](tests/headless/performance.spec.js)). Vitest config: [vitest.config.js](vitest.config.js); Playwright: [playwright.config.js](playwright.config.js).

Global `ENV` is injected by webpack `DefinePlugin` from `--env`: access via `ENV?.maxParticles`, `ENV?.record`, `ENV?.production`, `ENV?.version`, `ENV?.gtag_config`.

## Conventions

- **Scenario structure**: each scenario file exports an array. A callback receives `simulation`, sets `physics.*` properties, calls helpers like `createParticlesList()` / `createNuclei()`, and often opens with a local `defaultParameters()`. See [src/simulation/scenarios_v0/sandbox.js](src/simulation/scenarios_v0/sandbox.js) for a minimal example.
- **Particle creation**: use `createParticle()` / `createParticlesList()` from `scenariosHelpers.js` for scenarios; use `core.createParticleList()` for runtime additions (handles readback + GPU rebuild).
- **Physics config** is centralized in [src/simulation/physics.js](src/simulation/physics.js). Don't scatter raw constants — use `safeParseFloat()` and route updates through `core.updatePhysics()`.
- **2D mode**: `simulation.bidimensionalMode(true)` sets `mode2D` and disables orbit rotation. Scenarios set `simulation.mode2D = true` before `drawParticles()`.
- **GUI ↔ React bridge**: simulation-side GUI classes push items to React via `UI.addItem(component, item)` with `{ title, value, onFinish, folder }`. Refresh callbacks sync physics state back to the UI options object.
- **Particle types** (`ParticleType`): `default` (0), `probe` (1), `fixed` (2) — float values used in GLSL. Probes are used by `FieldGPU`; fixed particles skip velocity integration in the shader.
- **localStorage** key prefixes: `CustomDialog:` (position/size) and `DialogView:` (open/closed).
- The `src/simulation/types/` directory exists but is currently empty/unused.

## Documentation

Detailed technical docs live in [docs/](docs). Start with [docs/README.md](docs/README.md). Topics: architecture lifecycle, scenario authoring, UI bridge, GPU compute pipeline, developer workflows.

## Rules for commits in this repo

- **Never** add a `Co-Authored-By` trailer (or any co-author attribution) to commit messages.
- Match the existing terse, imperative style ("Fix X", "Add Y", "Refactor Z").
