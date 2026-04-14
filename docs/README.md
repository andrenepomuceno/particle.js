# Documentation

This folder contains the detailed project documentation for particle.js.
The top-level README stays focused on discovery, demo links, and a short technical summary.
The material in this folder is where contributor-facing depth lives.

The goal is to keep the documentation substantial instead of fragmented.
Most guides in this folder are intentionally long-form and should usually stay above 100 lines.
If a topic is too small for a full guide, it should normally be merged into an existing document instead of becoming a new page.

## Quick Navigation

- [Project README](../README.md)
- [Architecture and Simulation Lifecycle](./architecture-and-simulation-lifecycle.md)
- [Scenario Authoring and Physics Configuration](./scenario-authoring-and-physics-configuration.md)
- [UI Bridge and Runtime Controls](./ui-bridge-and-runtime-controls.md)
- [GPU Compute and Shader Pipeline](./gpu-compute-and-shader-pipeline.md)
- [Developer Workflows and Performance](./developer-workflows-and-performance.md)

## What This Folder Covers

The docs are organized around the parts of the codebase that carry the most conceptual weight:

- simulation startup and reset behavior
- scenario composition and physics configuration
- the bridge between the simulation-side GUI and the React UI
- the GPU compute and shader pipeline
- developer workflows, runtime modes, and performance constraints

These topics are the places where new contributors usually need context before making changes safely.
They are also the areas where the code is doing more than the file names alone suggest.

## Reading Order

If you want the most efficient path through the project, read the guides in this order:

1. [Architecture and Simulation Lifecycle](./architecture-and-simulation-lifecycle.md)
2. [Scenario Authoring and Physics Configuration](./scenario-authoring-and-physics-configuration.md)
3. [UI Bridge and Runtime Controls](./ui-bridge-and-runtime-controls.md)
4. [GPU Compute and Shader Pipeline](./gpu-compute-and-shader-pipeline.md)
5. [Developer Workflows and Performance](./developer-workflows-and-performance.md)

That sequence mirrors the way the application boots:

- the application starts and builds runtime objects
- a scenario populates the simulation
- the UI exposes runtime controls for that simulation
- the GPU updates and renders particles every frame
- the developer chooses the right workflow and performance budget for the current task

## Choose a Guide by Task

If your current task is operational rather than conceptual, use this shorter map:

- I need to run the project locally or choose the right npm script.
  Read [Developer Workflows and Performance](./developer-workflows-and-performance.md).
- I need to understand what happens when the app starts or resets.
  Read [Architecture and Simulation Lifecycle](./architecture-and-simulation-lifecycle.md).
- I need to add a new scenario or change the default parameters of an existing one.
  Read [Scenario Authoring and Physics Configuration](./scenario-authoring-and-physics-configuration.md).
- I need to add a runtime control, a dialog field, or a GUI refresh path.
  Read [UI Bridge and Runtime Controls](./ui-bridge-and-runtime-controls.md).
- I need to change physics flags, texture layout, or generated GLSL.
  Read [GPU Compute and Shader Pipeline](./gpu-compute-and-shader-pipeline.md).

## Documentation Map

| Guide | Main Focus | Primary Code Areas |
| --- | --- | --- |
| [Architecture and Simulation Lifecycle](./architecture-and-simulation-lifecycle.md) | startup, scenario loading, reset behavior, frame loop | `src/main.js`, `src/simulation/view.js`, `src/simulation/core.js`, `src/simulation/simulation.js` |
| [Scenario Authoring and Physics Configuration](./scenario-authoring-and-physics-configuration.md) | scenario registry, helpers, physics defaults, setup order | `src/simulation/scenarios.js`, `src/simulation/scenarios_v0/`, `src/simulation/scenariosHelpers.js`, `src/simulation/physics.js` |
| [UI Bridge and Runtime Controls](./ui-bridge-and-runtime-controls.md) | simulation-side GUI, React dialog state, refresh flow | `src/ui/App.jsx`, `src/ui/components/CustomDialog.jsx`, `src/simulation/gui/`, `src/simulation/view.js` |
| [GPU Compute and Shader Pipeline](./gpu-compute-and-shader-pipeline.md) | compute shader generation, GPU textures, readback, particle rendering | `src/simulation/graphics.js`, `src/simulation/shaders/computeShader.glsl.js`, `src/simulation/shaders/particleShader.glsl.js`, `src/simulation/core.js` |
| [Developer Workflows and Performance](./developer-workflows-and-performance.md) | webpack modes, ENV flags, runtime budgets, troubleshooting | `package.json`, `webpack-*.config.js`, `src/simulation/graphics.js` |

## Project Vocabulary

The same words appear in multiple guides.
These definitions are the baseline used throughout this folder.

- `scenario`: a named `{ name, callback }` entry registered in `src/simulation/scenarios.js`.
- `simulation`: the live `SimulationGPU` instance exported from `src/simulation/core.js`.
- `graphics`: the shared `GraphicsGPU` instance that owns the renderer, GPGPU state, and render targets.
- `physics`: the mutable `Physics` object that carries force constants, flags, and shader-related toggles.
- `particleList`: the JS array of particles that is mirrored into GPU textures.
- `mode2D`: the runtime mode that disables rotation and changes how positions and velocities are handled.
- `probe particle`: a particle of type `ParticleType.probe` used by the field visualization instead of the main physical system.
- `readback`: the explicit copy from GPU render targets back into JS particle objects.
- `shader update`: a change that requires the compute shader source to be regenerated and recompiled.
- `uniform update`: a change that only needs values inside existing shader programs to be refreshed.

## Source of Truth

The documentation is descriptive, not authoritative.
The code remains the source of truth.
When the docs and code disagree, trust the code first and then fix the docs.

The most important source files are:

- `package.json` for npm script names and supported local workflows
- `webpack-common.config.js`, `webpack-dev.config.js`, and `webpack-prod.config.js` for build behavior and injected `ENV` flags
- `src/main.js` for the startup path
- `src/simulation/core.js` for object lifecycle and physics updates
- `src/simulation/view.js` for event wiring and refresh cadence
- `src/simulation/graphics.js` for GPU ownership and rendering details
- `src/simulation/physics.js` for default parameters and enum values
- `src/ui/App.jsx` for dialog state and the UI bridge entry point

## Documentation Conventions

The docs in this folder follow a few project-specific rules:

- Prefer a few dense guides over many short pages.
- Explain why a flow exists before listing the steps inside it.
- Link to neighboring guides when a topic crosses subsystem boundaries.
- Call out traps where stale references, hidden state, or GPU ownership can surprise contributors.
- Document the code that exists today, not a planned refactor.
- Keep examples close to real project files instead of using abstract pseudo-APIs.

## Updating This Documentation

When you change core behavior, update the relevant guide in the same pull request.
Use the following rough ownership model:

- startup, reset, or frame loop changes belong in the architecture guide
- scenario shape, helper usage, or physics defaults belong in the scenario guide
- dialog behavior, control registration, or refresh policy belong in the UI guide
- compute shader flags, readback behavior, or render target semantics belong in the GPU guide
- npm scripts, runtime modes, or sizing/performance advice belong in the workflow guide

## What Is Intentionally Not Here

This folder is not trying to be a line-by-line API reference.
The codebase is still plain JavaScript, and several classes expose many small helper methods that are easier to understand from context than from generated reference pages.

This folder is also not split by every individual scenario.
That would create a large maintenance surface and quickly fragment the material.
Instead, the scenario guide explains the shared authoring patterns and points to representative files when examples are needed.

## Start Here

For a first technical pass through the project, begin with [Architecture and Simulation Lifecycle](./architecture-and-simulation-lifecycle.md).
After that, choose between the scenario, UI, and GPU guides based on the subsystem you want to change.
If your goal is simply to run the project or compare `npm start`, `npm run low`, and `npm run record`, go directly to [Developer Workflows and Performance](./developer-workflows-and-performance.md).

Every substantive guide in this folder includes direct links back to this index, to the project README, and to the previous or next guide in the reading order.
