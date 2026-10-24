# Architecture

```
src/
  engine/            pure simulation code, no React
    expr/            parser → AST; toGlsl, compileJs, derivative, simplify
    forces/          ForceDefinition, compileForce, variable catalogue, presets
    shaders/         velocity/position compute shader generation
    gpu/GpuCompute   ping-pong render targets, shader validation, upload/readback
    render/          ParticlePoints: draws particles straight from the GPU textures
    cpu/             referenceStep: float64 mirror of the shaders (the spec)
    particles.ts     ParticleSet, struct-of-arrays mirroring the textures
    settings.ts      SimulationSettings + validation
    snapshot.ts      JSON export/import with path-precise validation
    json.ts          JsonReader: typed readers that fail with the JSON path
  scenarios/         scenario JSON library + parser/builder (scenarioFile.ts)
  app/               SimulationController (owns everything at runtime) + Store
  ui/                React: dialogs, force editor, actions table, pointer gestures
```

## One AST, three backends

A force expression is parsed once. The same AST is emitted as GLSL for the compute
shader, compiled to JS closures for the plot and `referenceStep`, and differentiated
symbolically for potential mode. This keeps GPU, plot and tests in agreement by
construction; never write force GLSL by hand.

## GPU data layout

Four RGBA float textures of `width × width` texels, one particle per texel, index
`k ↔ (k mod width, k div width)`:

| Texture | x | y | z | w |
| --- | --- | --- | --- | --- |
| position (ping-pong) | x | y | z | kind (1 dynamic, 2 fixed) |
| velocity (ping-pong) | vx | vy | vz | particle clock |
| attributes (static) | mass | charge | spin | parity |
| color (static) | red | green | blue | 0 |

`ParticleSet` uses exactly this layout, so upload and readback are plain copies.
Only `[0, count)` is simulated; the pair loop runs to `uCount`, not over the full texture.

## Frame

`SimulationController.frame`: velocity pass → position pass (swap) → render. The CPU copy
of particle state is stale after a step; anything that reads or edits particles goes
through `syncFromGpu()` / `editParticles()` (read back, mutate, upload). Readback stalls
the GPU, so it only happens on demand (inspect, pick, select, edit, export).

## Recompilation

`setForces` validates every definition, keeps the enabled valid ones and compares a
structural key (expressions, modes, ranges, parameter names). Same key → only uniforms
change. New key → the velocity shader is regenerated, compiled against the raw GL context
first, and swapped in only if it compiled; otherwise the previous program keeps running
and the info log is shown in the Forces dialog.

## UI wiring

The controller is created once in `main.tsx` and provided through React context. State
lives in a small `Store`; components subscribe to slices with `useAppState(selector)`
(`useSyncExternalStore`), so the per-frame clock does not re-render unrelated panels.
`src/ui/actions.ts` is the single table of actions and shortcuts used by the keyboard,
the Controls/Selection dialogs and the Shortcuts dialog.
