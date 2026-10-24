# Particle style: v1 "spherow" with meaningful colors

User request: keep the original project's look.

- Raymarched sphere with an arrow through it along the velocity (v1 `particleShader.glsl.js`,
  mode `spherow`), lit as in v1; flat 2D circle as the cheap alternative (v1 "3D shader" toggle).
- Sphere color as v1 `generateParticleColor`: charge > 0 blue, < 0 red, 0 gray; color-charge tint;
  extend the tint to v2's vector color charge, spin and parity.
- Arrow color by speed: hue 0..0.833 over 16 × average speed, white when saturated
  (needs an average-speed uniform; v1 refreshed it on its periodic readback).

## Result

Done in `src/engine/render/ParticlePoints.ts`. Ported v1's arrow SDF, sphere + arrow
raymarch, meaningful color and speed palette. Deliberate differences from v1 (all
recorded in `docs/interaction.md`): the ray starts on the camera side, so v1's mirrored
back-hemisphere view is gone; the light is view-attached; there is no arrow on still
particles. Optimizations: analytic bounding-sphere entry, analytic sphere normal,
tetrahedral normal for the arrow, 24 steps. Galaxy in SwiftShader went from 9 to 16–45 fps;
the readings swing with machine load the same way for the `flat` style. The mean speed is
sampled by a 1 Hz readback. Also added in the same pass at the user's request: FPS limit
30/60/display rate. A first MessageChannel-driven "unlimited" mode was dropped: with the
simulation paused it queued unseen frames until screenshots timed out. Verified with close-up screenshots
and `npm run smoke:all` (6/6 scenarios; FPS cap measured at 30.0).
