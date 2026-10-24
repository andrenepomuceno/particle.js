# Scripted scenarios: timeline of events (v1 actions)

User request (2026-10-24): v1's scripted simulations (animations over time) are part of what makes
them fun; sweep, select and bring them over.

v1 mechanism (src/simulation/simulation.js addAction/actionList; used in scenarios_v1/forceMap.js
and record.js): at a cycle, run a callback that changes physics constants (core.updatePhysics,
often multiplying them), shows a caption, or starts a camera transition (cameraTransition helper).

v2 design (declarative, validated like the rest of the format):
- `timeline: [{ "at": <simulation time>, "set": { "<force name>.<param>": value | {"multiply": f},
  "settings.<key>": value }, "caption": "text with {Force.param} interpolation",
  "camera": { "position": [x,y,z], "target": [x,y,z], "duration": t } }]`
- Controller applies events when simulation time passes `at` (in order; reset rewinds); captions
  shown as an overlay; camera transitions interpolate over `duration` of wall time.
- Then port the scripted v1 scenarios (Welcome, The Egg, Gravity, Planetoid Formation, ...).
