# Integrator options

Only semi-implicit Euler exists. Add velocity Verlet / leapfrog (needs the previous
acceleration in a texture) and expose the choice in Parameters. Keep `referenceStep`
as the spec for each scheme.

## Result

Done: velocity Verlet (default) next to semi-implicit Euler, selectable in Parameters, scenario
files and snapshots (version 3; versions 1–2 load as Euler, which they ran with). GPU: acceleration
ping-pong, three passes (drift, acceleration at t + dt, kick), shared `totalForce`/`finishVelocity`
GLSL. Verified: CPU energy drift Euler 7.3e-3 vs Verlet 2.3e-4 (dt 0.5) and 1.4e-3 vs 9.0e-6
(dt 0.1); time-reversibility test; `scripts/parity.mjs` GPU vs float64 reference: binary 2000 steps
≤ 1e-4, many-body 200 steps ≤ 3e-5 for both integrators. A 4th-order scheme (Yoshida, 3 force
evaluations per step) was not added; ask the user if wanted.
