# Copilot Instructions (particle.js)

## Big picture architecture
- Entry point: [src/main.js](src/main.js) calls `UI.start()` (React) then `viewSetup()` (simulation + render loop).
- Core simulation in [src/simulation](src/simulation):
  - `Core` ([src/simulation/core.js](src/simulation/core.js)) — scenario selector; (re)creates `SimulationGPU` + `Physics` + `FieldGPU`. The exported `simulation` variable is **reassigned** on each `core.setup()` call, so always import it as a live binding.
  - `SimulationGPU` ([src/simulation/simulation.js](src/simulation/simulation.js)) — owns particle list, per-frame `step()`, delegates GPU work to `GraphicsGPU`.
  - `GraphicsGPU` ([src/simulation/graphics.js](src/simulation/graphics.js)) — three.js renderer + `GPUComputationRenderer`. A **single** instance is shared across scenario resets (only `cleanup()` + `drawParticles()` are called, not a new constructor).
  - `FieldGPU` ([src/simulation/field.js](src/simulation/field.js)) — injects probe particles for vector-field visualization; shares the same particle list.
- Shaders are **generated JS→GLSL**: [src/simulation/shaders/computeShader.glsl.js](src/simulation/shaders/computeShader.glsl.js) builds velocity/position compute shaders, [src/simulation/shaders/particleShader.glsl.js](src/simulation/shaders/particleShader.glsl.js) builds rendering shaders. Both emit GLSL strings with `#define` flags derived from `Physics` properties.
- Scenarios: arrays of `{ name, callback }` objects composed in [src/simulation/scenarios.js](src/simulation/scenarios.js) via `addFolder()`. Callbacks receive `simulation` and configure `physics` + populate `particleList` directly.
- UI is two-layered:
  - **React/MUI layer** ([src/ui](src/ui)): `UI` singleton in [src/ui/App.jsx](src/ui/App.jsx) owns dialog state and renders views. `useDialogView()` persists open/closed state in `localStorage`.
  - **Simulation GUI layer** ([src/simulation/gui](src/simulation/gui)): classes like `GUIParameters`, `GUIControls` register items via `addUIOption()` from [src/simulation/gui/uiHelper.js](src/simulation/gui/uiHelper.js), which calls `UI.addItem()` to push into the React layer. Input handlers live in [src/simulation/components](src/simulation/components).
  - `viewSetup()` in [src/simulation/view.js](src/simulation/view.js) wires input events, GUI panels, the `requestAnimationFrame` render loop, and the `guiOptions` bridge object.

## Key data flow patterns
- **Scenario load**: `core.setup(idx)` → `new SimulationGPU(graphics, new Physics())` → `simulation.setup(particleSetup)` → scenario callback populates `simulation.physics.particleList` → `simulation.drawParticles()` rebuilds GPU textures.
- **Per-frame**: `SimulationGPU.step(dt, time)` → `graphics.compute(dt, time)` (GPU compute shaders advance positions/velocities) → `graphics.render()`.
- **Physics → shader pipeline**: boolean physics flags map to `#define`s. Changing a flag that affects shaders requires calling `graphics.drawParticles(list, physics, shaderUpdate=true)`. Use `core.updatePhysics(key, value)` which routes through an `updateFunctionMap` that correctly sets `updateShader` / `fillPhysics` flags.
- **Max particles**: `ENV.maxParticles` (webpack `--env`) → `calcTextWidth()` → square texture width. Exceeding it triggers alerts. Adjustable at runtime via `graphics.setMaxParticles()`.
- **GPU readback**: call `graphics.readbackParticleData()` before reading particle positions/velocities from JS (e.g. before creating new particles or exporting).

## Developer workflows
- Dev server: `npm start` → webpack dev server at `localhost:8080` (20k particles).
- `npm run low` — 10k particles. `npm run record` — 50k particles, port 8081, enables `canvas-capture` recording.
- `npm run build` / `npm run prod` — production bundle (10k particles).
- Dependency graphs: `npm run madge-simple` and variants generate SVG in `img/`.
- **No test framework** — there are no unit tests. `npm run test` is the dev server alias.
- Global `ENV` object is injected by webpack `DefinePlugin` from `--env` flags; access via `ENV?.maxParticles`, `ENV?.record`, `ENV?.production`, `ENV?.version`.

## Project-specific conventions
- **Scenario structure**: each scenario file exports an array. A scenario callback receives `simulation`, sets up `physics.*` properties, calls helpers like `createParticlesList()` / `createNuclei()` from [src/simulation/scenariosHelpers.js](src/simulation/scenariosHelpers.js), and often begins with a `defaultParameters()` local function. See [src/simulation/scenarios_v0/sandbox.js](src/simulation/scenarios_v0/sandbox.js) for a minimal example.
- **Particle creation**: use `createParticle()` / `createParticlesList()` from `scenariosHelpers.js` for scenarios, or `core.createParticleList()` for runtime additions (handles readback + GPU rebuild).
- **Physics config** is centralized in the `Physics` class ([src/simulation/physics.js](src/simulation/physics.js)). Avoid scattering raw constants; use `safeParseFloat()` and route UI updates through `core.updatePhysics()`.
- **2D mode**: `simulation.bidimensionalMode(true)` sets `mode2D` and disables orbit rotation. Scenarios set `simulation.mode2D = true` before `drawParticles()`.
- **GUI ↔ React bridge**: simulation-side GUI classes push items to React via `UI.addItem(component, item)`. Each item has `{ title, value, onFinish, folder }`. Refresh callbacks sync physics state back to the UI options object.
- **Particle types**: `ParticleType.default` (0), `.probe` (1), `.fixed` (2) — these are float values used in GLSL. Probes are used by `FieldGPU`; fixed particles skip velocity integration in the shader.
- **localStorage**: both `CustomDialog` (position/size) and `useDialogView` (open/closed) persist to `localStorage` with key prefixes `CustomDialog:` and `DialogView:`.
- **No TypeScript** — plain JS + JSX with Babel. The `src/simulation/types/` directory exists but is currently empty/unused.
