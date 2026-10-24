# Vector field visualization

v1 had probe particles drawn as arrows showing the net field (keys J toggle, F resize).
Port it: a probe grid rendered from a separate compute pass that reuses the generated
force functions with a unit test particle, so no second copy of the force code exists.

## Result

Done. `generateFieldShader` calls the same generated `totalForce` at probe positions with
index −1 and a test particle from uniforms (clock 0); probes live in their own textures in
`GpuCompute` (`setProbes`/`computeField`), share the force uniforms and are rebuilt lazily after
a force recompile. `FieldArrows` draws point-sprite arrows from those textures, colored red →
magenta up to the 90th percentile of |F| (white beyond; v1's 16× mean is dominated by 1/r² spikes).
Grid: square cells, 48 columns by default, z = 0 in 2D, plane through the orbit target facing
the camera in 3D. Keys J (toggle) and F (re-fit, v1 parity); follow moved from F to L. Field
dialog with grid columns, auto re-fit after camera moves and the test particle's attributes.
Recomputed at most every 100 ms while time runs or right after an edit.
Verified: unit tests for grid/view/reference/probe validation and `referenceField` matching
`referenceStep`'s force (188 tests); `npm run parity` GPU probes vs float64 mirror 1.9e-7
relative; smoke J/F checks; screenshots of plasma, nuclei (2D) and a tilted galaxy (3D) show
the expected inward/outward fields. Not done: arrows are drawn flat (no raymarched 3D arrows
as v1's field3d), the grid does not follow the camera while following a particle, and there
is no field volume (v1's 3D cube grid).
