# Evaluate adopting shader-autodiff for the expression compiler

User pointer (2026-10-24): /mnt/d/Desktop/shader-autodiff (the user's own MIT library, on npm as
shader-autodiff@0.2.0, ~1.5k lines, no dependencies). Same idea as src/engine/expr (parser → one
graph → GLSL/JS + derivatives) with more: hash-consed SSA graph (CSE), safety limits on
length/depth/nodes, forward-mode gradients/Jacobians/Hessians in several variables, WGSL and TSL.

Why it matters here:
- CSE: shared subexpressions (σ/r in Lennard-Jones, c_dot terms) computed once in the O(N²) loop.
- Gradients w.r.t. the 3D relative position: a potential V(Δx) yields the full vector force
  F = −∇V, which would lift the central-force-only limits (spin dipole angular part, potential mode
  rejecting si_r/sj_r) — needs the force loop to accept a vector per pair.
- WGSL/TSL keeps a WebGPU path open.

Plan: spike behind the existing interface (compileForce → magnitude GLSL + JS evaluate), keep our
variable catalogue/validation messages, run unit tests + `npm run parity`; then decide on the
vector-force extension. After the v1 scenarios + timeline work.

## Decision (2026-10-24)

The user agreed a general Lagrangian adds nothing over force + potential modes (for pair forces
Euler–Lagrange gives F = −dV/dr). Go ahead with: (1) this adoption, then (2) potentials of the full
relative position V(Δx) with the vector force F = −∇V (non-central: spin dipole angular part,
si_r/sj_r in potential mode). Velocity-dependent forces: see `velocity-dependent-forces.md`.

## Result

Adopted shader-autodiff@0.2.0 (exact version). compileForce keeps our parser/validation and builds
one library Program per force (variable r, everything else parameters renamed to our uniforms and
pair bindings): GLSL for the force/potential functions (header patched to the pair signature) and
JS for the plot and referenceStep. Removed our derivative.ts and toGlsl/ipow emitter; evaluate.ts
stays as the independent interpreter the tests use to check F = -dV/dr by central differences.
Parity 9/9, library snapshots clean, 7–17% more steps/s (memory-bound loop, CSE helps a little).

Library issue found (for the user's repo): GLSL `pow(q, n)` with a negative base and a non-literal
integer exponent is undefined while the JS output gives Math.pow; patched here by emitting spow.

Next: vector forces from V(Δx) → `vector-forces-from-potential.md`.
