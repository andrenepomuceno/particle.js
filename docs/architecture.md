# Architecture

```
src/
  engine/            pure simulation code, no React
    expr/            parser → AST; toGlsl, compileJs, derivative, simplify
    forces/          ForceDefinition, compileForce, variable catalogue, presets
    shaders/         velocity/position compute shader generation
    gpu/GpuCompute   ping-pong render targets, shader validation, upload/readback
    render/          ParticlePoints (spherow/flat sprites) and FieldArrows, drawn straight from GPU textures
    cpu/             referenceStep, energy, field: float64 mirrors of the shaders (the spec)
    particles.ts     ParticleSet, struct-of-arrays mirroring the textures
    field.ts         field probe grid placement, color reference, test particle
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
| attributes (static) | mass | charge q | charge q2 | parity |
| color (static) | red | green | blue | nuclear charge |
| spin (static) | sx | sy | sz | isospin I₃ |

`ParticleSet` uses exactly this layout, so upload and readback are plain copies.
Only `[0, count)` is simulated; the pair loop runs to `uCount`, not over the full texture.

## Frame

`SimulationController.frame`: velocity pass → position pass (swap) → render. The CPU copy
of particle state is stale after a step; anything that reads or edits particles goes
through `syncFromGpu()` / `editParticles()` (read back, mutate, upload). Readback stalls
the GPU, so it only happens on demand (inspect, pick, select, edit, export).

## Energy pass

`generatePotentialShader` builds a third program from the same ASTs: per particle Σ_j V(r_ij)
for every potential-mode force, with the same softening and cutoff. It shares the force uniforms
with the velocity pass and runs only for the Statistics dialog's 1 Hz sample
(`GpuCompute.readPotentials`). `src/engine/cpu/energy.ts` is its float64 mirror and turns
velocities and potentials into kinetic/potential energy, speeds and temperature.

## Field probe pass

`generateFieldShader` wraps the same generated `totalForce` as the velocity and acceleration
passes and calls it at each probe position with index −1 (matches no particle), the test
particle's attributes from uniforms and clock 0. Probes live in their own textures
(`GpuCompute.setProbes`: positions in, (F, |F|) out), never in the particle set, so they do
not move, count, get picked or end up in snapshots. The program shares the force uniforms,
is built lazily and rebuilt after a force recompile, like the energy pass. `FieldArrows`
(`src/engine/render/`) draws one point sprite per probe straight from those two textures;
the CPU only reads |F| back to pick the color reference (`fieldReference`, the 90th
percentile). The controller lays the grid with `fieldGrid(fieldView(camera))` and reruns the
pass at most every 100 ms while time advances, or right after an edit. `src/engine/cpu/field.ts`
is its float64 mirror; `npm run parity` compares the two.

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
