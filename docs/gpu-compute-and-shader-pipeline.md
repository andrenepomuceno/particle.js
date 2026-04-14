# GPU Compute and Shader Pipeline

This guide explains how particle.js turns JS-side physics configuration into GPU compute work and rendered particles.
It focuses on the boundary between three pieces of the system:

- the `Physics` object, which carries feature flags and numeric constants
- `GraphicsGPU`, which owns textures, render targets, and shader programs
- the shader generator modules, which emit GLSL strings from JS

If you want to change a force model, add a shader-facing boolean, or understand why some physics edits need a redraw while others only need a uniform refresh, this is the guide to read.

## High-Level Pipeline

The runtime pipeline looks like this:

1. a scenario or runtime control mutates the `Physics` object
2. `GraphicsGPU.drawParticles()` prepares textures and shader state
3. compute shaders update position and velocity on GPU render targets
4. the particle vertex and fragment shaders render those GPU results to the canvas
5. when JS needs authoritative particle data again, `readbackParticleData()` copies the GPU state back into the particle list

The important idea is that the JS particle objects are not continuously authoritative once the simulation starts stepping.
After the GPU has advanced, the GPU owns the freshest position and velocity state until readback happens.

## Texture Budget and Particle Capacity

`GraphicsGPU` computes its texture budget from `ENV.maxParticles`.
The helper used is:

```js
function calcTextWidth(n) {
    return Math.max(Math.round(Math.ceil(Math.sqrt(n)) / 2) * 2, 2);
}
```

The resulting `textureWidth` is used to derive:

- `maxParticles = textureWidth * textureWidth`
- the size of the GPGPU textures
- the UV grid assigned to particle points

This means capacity is square-texture based.
The requested particle count is rounded into a texture width that can hold at least that many entries.
The effective capacity can therefore be slightly higher than the nominal `ENV.maxParticles` request.

## What `drawParticles()` Really Does

`GraphicsGPU.drawParticles(particleList, physics, shaderUpdate)` is the main upload and reinitialization entry point.
It does more than draw.

Its responsibilities are:

- optionally regenerate compute shader source when `shaderUpdate` is true
- store the current particle list and physics object
- validate that the list fits under `maxParticles`
- allocate CPU-side `Float32Array` buffers for position and velocity readback
- initialize the GPU compute renderer and associated textures
- initialize the points object used for visible rendering
- mark the graphics layer as initialized

Because of that behavior, `drawParticles()` is the correct place for full simulation redraws after setup changes, particle list replacement, or shader-sensitive physics changes.
It is not just a paint call.
It is a major synchronization boundary.

## Generated Compute Shader Source

The compute shader source does not live as a static GLSL file.
`src/simulation/shaders/computeShader.glsl.js` generates the final source string in JavaScript.

The two exported generators are:

- `generateComputeVelocity(physics)`
- `generateComputePosition(physics)`

Both prepend a block of `#define` values before concatenating the actual GLSL body.
Examples include:

- `ENABLE_BOUNDARY`
- `USE_BOX_BOUNDARY`
- `USE_DISTANCE1`
- `ENABLE_COLOR_CHARGE`
- `MODE_2D`
- `ENABLE_FRICTION`
- `FRICTION_DEFAULT`
- `USE_LORENTZ_FACTOR`
- `USE_RANDOM_NOISE`
- `USE_POT_DEFAULT`
- `USE_FMAP2`
- `USE_LENNARD_JONES`

This design makes shader branching explicit and compile-time driven.
It also means that toggling one of these booleans is not equivalent to changing a uniform.
A flag-backed change may require new shader source and therefore recompilation.

## Which Physics Changes Need Shader Regeneration

The rule is simple in concept even though it is implemented with switches and maps in `src/simulation/core.js`:

- numeric changes that only feed existing uniforms usually need `graphics.fillPhysicsUniforms()`
- booleans or enums that change generated `#define` values need `graphics.drawParticles(..., true)`

`core.updatePhysics()` is the policy layer for this distinction.
It tracks two booleans internally:

- `fillPhysics`
- `updateShader`

When `updateShader` is true, it calls:

```js
graphics.drawParticles(simulation.particleList, simulation.physics, true);
```

When `fillPhysics` is true, it calls:

```js
graphics.fillPhysicsUniforms();
```

That is why UI code should not try to decide shader policy on its own.
The logic already exists in `core.updatePhysics()`.

## Representative Mutation Cases

A few examples make the distinction concrete:

- changing `massConstant` updates uniforms only
- changing `chargeConstant` updates uniforms only
- changing `enableColorCharge` regenerates the shader
- changing `enableFineStructure` regenerates the shader
- changing `enableBoundary` regenerates the shader
- changing `frictionConstant` updates uniforms only
- changing `frictionModel` regenerates the shader
- changing `forceMap` updates uniforms only
- changing `mode2D` regenerates the shader

Some cases also do extra bookkeeping.
Changing `nuclearPotential`, for example, may replace the `forceMap` array for parameterized models such as the QCD test or Lennard-Jones mode.

## Uniform Population

`GraphicsGPU.fillPhysicsUniforms()` writes the current physics values into the uniforms used by the compute programs.
The velocity shader receives values such as:

- `timeStep`
- `minDistance2`
- `massConstant`
- `chargeConstant`
- `nuclearForceConstant`
- `nuclearForceRange`
- `boundaryDistance`
- `boundaryDamping`
- `frictionConstant`
- `forceConstants`
- `maxVel`
- `fineStructureConstant`
- `colorChargeConstant`
- `randomNoiseConstant`
- `forceMap`
- `forceMapLen`

The position shader receives a smaller set, mainly the values it needs for integration and boundary handling.
This split is part of why the compute pipeline stays manageable despite multiple force modes.

## Particle Data Layout

Particle state is packed into several GPU textures.
The fill step in `GraphicsGPU.#fillTextures()` writes:

- position into `dtPosition`
- velocity into `dtVelocity`
- physical properties into `dtProperties`
- extra properties into `dtProperties2`

The encoded layout is important:

- `position.xyz` stores particle position
- `position.w` stores particle type
- `velocity.xy` stores velocity x and y
- `velocity.z` stores velocity z in 3D, or `outOfBoundary` in 2D
- `velocity.w` stores collision count
- `props.x` stores mass
- `props.y` stores charge
- `props.z` stores nuclear charge
- `props.w` stores color charge
- `props2.x` stores particle type again
- `props2.y` stores radius

Unused texture cells are filled with `ParticleType.undefined` and zeros.
That is how the shader can skip inactive slots cleanly.

## Particle Types in the GPU Path

The compute and render shaders both define particle type constants:

- `UNDEFINED = -1.0`
- `DEFAULT = 0.0`
- `PROBE = 1.0`
- `FIXED = 2.0`

These values are not just JS-side enums.
They are part of the shader contract.
A type change affects how particles are integrated and rendered.
For example:

- probe particles are used for field visualization rather than normal matter
- fixed particles are expected to skip normal motion updates
- undefined particles represent unused texture slots

When adding a new particle type, you would need coordinated changes across JS and GLSL.
This is not a one-file change.

## Compute Step and Ping-Pong Render Targets

`GraphicsGPU.compute(dt, time)` performs the per-frame GPU step.
It uses a ping-pong pattern across render targets:

1. choose the current and target render target indices
2. write the new velocity texture using the previous velocity and position textures
3. write the new position texture using the new velocity texture and the previous position texture
4. update point-render uniforms so rendering uses the fresh textures

This means no compute shader writes in place to the same texture it is reading.
That separation avoids feedback hazards and is standard for GPU simulation work.

## Rendering Path

After compute, the visible point cloud is rendered through the particle shader system in `src/simulation/shaders/particleShader.glsl.js`.
The render path has two stages:

- `particleVertexShader` samples texture-based position and velocity for each particle point
- `generateParticleShader(...)` emits a fragment shader with feature flags for 3D arrows, 3D spheres, and particle style modes

The points geometry also stores per-particle color, radius, and UVs.
The UV buffer is how each point knows which texel to sample from the simulation textures.
That is why `GraphicsGPU.#fillPointUVs()` is part of initialization whenever the particle layout is rebuilt.

## Readback and JS Authority

`GraphicsGPU.readbackParticleData()` copies current GPU render targets back into the JS particle objects.
This function is expensive enough that the code treats it as explicit synchronization rather than something that happens automatically every frame.

The method:

- reads current position and velocity render targets into CPU arrays
- updates each particle object's `position`, `velocity`, `outOfBoundary`, and `collisions`
- refreshes the points geometry position attribute from the readback values

Use readback before JS-side operations that depend on current particle positions or velocities.
Representative cases already in the codebase include:

- raycasting in 2D mode
- runtime particle creation through `core.createParticleList()`
- particle editing in `core.updateParticle()`
- info panels when auto-refresh is enabled

If you skip readback before inspecting GPU-owned state, you are not reading current data.
You are reading the last synchronized snapshot.

## Field Probes and Shared Capacity

`FieldGPU` creates probe particles and pushes them into the same particle list used by the main simulation.
That means field visualization consumes part of the same `maxParticles` budget.

`FieldGPU.checkGridSize()` explicitly calculates whether a new probe grid will exceed the capacity.
If it would, the system refuses the change and alerts the user.
This is why the performance guide treats field probes as part of the particle budget rather than as a free overlay.

## Safe Workflow for GPU-Sensitive Changes

When you modify the GPU path, use this checklist:

1. decide whether the change is a uniform-only change or a shader-shape change
2. if it changes generated `#define` values, route it through `core.updatePhysics()` with `updateShader = true`
3. if it changes particle data layout, update both the JS packing code and the GLSL readers
4. if JS needs current data after the change, perform readback intentionally
5. confirm the particle count still fits the texture budget

## Common GPU Pitfalls

The most frequent mistakes in this part of the codebase are:

- treating GPU state and JS particle objects as if they are always synchronized
- toggling a shader-facing boolean without regenerating shader source
- changing the meaning of a packed texture channel in JS but not in GLSL
- forgetting that field probes consume the same particle budget as regular particles
- assuming `setMaxParticles()` alone is enough without the redraw path that rebuilds textures

## When to Cross-Reference Other Guides

If the GPU change originates from a scenario default, read [Scenario Authoring and Physics Configuration](./scenario-authoring-and-physics-configuration.md).
If it originates from a runtime control, read [UI Bridge and Runtime Controls](./ui-bridge-and-runtime-controls.md).
If you are choosing the right local mode for debugging a GPU-heavy scenario, read [Developer Workflows and Performance](./developer-workflows-and-performance.md).
