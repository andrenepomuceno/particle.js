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
