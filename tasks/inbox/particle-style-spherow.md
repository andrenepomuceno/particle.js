# Particle style: v1 "spherow" with meaningful colors

User request: keep the original project's look.

- Raymarched sphere with an arrow through it along the velocity (v1 `particleShader.glsl.js`,
  mode `spherow`), lit as in v1; flat 2D circle as the cheap alternative (v1 "3D shader" toggle).
- Sphere color as v1 `generateParticleColor`: charge > 0 blue, < 0 red, 0 gray; color-charge tint;
  extend the tint to v2's vector color charge, spin and parity.
- Arrow color by speed: hue 0..0.833 over 16 × average speed, white when saturated
  (needs an average-speed uniform; v1 refreshed it on its periodic readback).
