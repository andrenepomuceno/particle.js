# Forces

## Model

Classical mechanics only. For particles *i* and *j* at distance *d*, each enabled force
contributes a signed scalar `F` along `(x_i − x_j) / d`:

- `F > 0` pushes the pair apart, `F < 0` pulls it together.
- **Long range**: applied at every distance.
- **Short range**: applied only when `d < cutoff`. The cut is hard (no smoothing), so a
  potential that is not zero at the cutoff produces a force step there.
- **Softening** ε: the expression receives `r = √(d² + ε²)`; the direction still uses the
  real `d`. Use it to keep `1/r²`-type forces finite at close range.
- Coincident particles (`d = 0`) do not interact.

Two integrators (Parameters → Integrator), both one force evaluation per step:

- **Velocity Verlet** (default, 2nd order, time-reversible): `x += v·dt + ½·a·dt²`, then
  `a' = ΣF(x')/m` (at time t + dt, clocks already advanced), then `v += ½(a + a')·dt`.
  The previous acceleration is kept on the GPU and recomputed after any edit.
- **Semi-implicit Euler** (1st order, v1's scheme): `v += (ΣF / m)·dt`, then `x += v·dt`.

After the velocity update both apply friction `v *= e^(−friction·dt)`, the optional speed clamp,
then boundary reflection. Fixed particles never move; every clock `t` advances by `dt`.
Measured on a gravitational binary over t = 200 (relative energy error): Euler 7.3e-3 / 1.4e-3,
Verlet 2.3e-4 / 9.0e-6 at dt = 0.5 / 0.1. `src/engine/cpu/referenceStep.ts` is the executable
specification of both, and `npm run parity` checks the GPU against it.

## Writing an expression

Mode **force**: the text is `F(r)`. Mode **potential**: the text is `V(r)` and the engine
uses `F = −dV/dr`, differentiated symbolically (exact, no finite differences). In a
short-range potential `x` is expanded to `r / cutoff` before differentiating.

Operators: `+ - * / ^` (`**` is accepted for `^`; `^` is right-associative and binds
tighter than unary minus, so `-2^2 = -4`). Functions: `sin cos tan asin acos atan sinh
cosh tanh exp log sqrt abs sign floor min max pow step clamp`. Constants: `pi`, `e`.

Variables:

| Name | Meaning |
| --- | --- |
| `r` | softened distance |
| `x`, `cutoff` | `r / cutoff` and the cutoff itself (short range only) |
| `m_i`, `m_j` | mass (must be > 0) |
| `q_i`, `q_j` | charge, first component (the electric charge) |
| `q2_i`, `q2_j` | charge, second component (the charge is a generic 2D vector) |
| `q_dot` | `q_i·q_j` over both components |
| `sx_*`, `sy_*`, `sz_*` | spin vector components |
| `s_dot` | `s_i·s_j` |
| `si_r`, `sj_r` | `s_i·r̂`, `s_j·r̂`, with r̂ pointing from j to i |
| `i3_i`, `i3_j` | isospin projection I₃ (u: +½, d: −½) |
| `p_i`, `p_j` | parity |
| `n_i`, `n_j` | nuclear charge (v1's coupling for the nuclear force) |
| `cr_*`, `cg_*`, `cb_*` | color charge amounts (r, g, b) as stored |
| `cx_*`, `cy_*` | color vector in the 120° weight plane |
| `c_dot` | color factor `C_i · C_j` (see below) |
| `t_i`, `t_j` | particle clocks |
| `time` | global simulation time |

`_i` is the particle receiving the force, `_j` the one exerting it. Any other name must be
declared as a parameter of the force. Parameters are GPU uniforms: editing their values
never recompiles. Editing the expression, mode, range, enabled flag or the parameter
*names* recompiles the velocity shader.

Validation reports every problem at once (unknown variables, bad parameter names,
non-positive cutoff, …). A force with errors is skipped; the others keep running.

## Examples

| Force | Mode | Range | Expression |
| --- | --- | --- | --- |
| Gravity | force | long | `-G * m_i * m_j / r^2` |
| Coulomb | force | long | `k * q_dot / r^2` |
| v1 nuclear | force | short | `k * n_i * n_j * sin(2 * pi * x)` |
| Lennard-Jones | potential | short | `4 * epsilon * ((sigma / r)^12 - (sigma / r)^6)` |
| Yukawa | potential | short | `-g^2 * exp(-r / lambda) / r` |
| Spring | potential | short | `0.5 * k * (r - r0)^2` |
| Cornell (color) | potential | short | `c_dot * (alpha / r - sigma * r)` |
| Spin dipole | force | short | `3 * k * (s_dot - 3 * si_r * sj_r) / r^4` |

All of them are presets in the Forces dialog (`src/engine/forces/presets.ts`).

## Collisions

Parameters → *Collision distance* (0 = off, as in v1) and *Collision restitution* (1 elastic,
0 perfectly inelastic). In each velocity update, every pair closer than the distance that is
still approaching gets the impulse `Δv_i = −(1 + e)·m_j/(m_i + m_j)·((v_i − v_j)·n̂)·n̂` (n̂ from j
to i), computed from the same pre-step velocities for all pairs, so momentum is conserved and
kinetic energy too for e = 1. Pairs inside the distance contribute no force that step, which
keeps 1/r² terms from exploding on contact. Both integrators apply it (Verlet after its drift).

## Spin, 2D charge and isospin

- **Spin** is a fixed 3D vector per particle. Expressions can depend on its orientation
  (`s_dot`, `si_r`, `sj_r`), but forces stay central (along r̂) and spins never rotate: there is
  no torque or precession. The *Spin dipole* preset is the central part of the magnetic
  dipole-dipole force, written in force mode: with direction-dependent terms V(r) is not a true
  potential (the missing torque would do work), so potential mode rejects `si_r`/`sj_r`, and the
  energy chart lists such forces as missing instead of reporting a drifting total.
- **Charge** is a generic 2D vector (`q`, `q2`; user decision). Electromagnetism only needs the
  first component (U(1) has rank 1, so its charges are real); `q_dot` lets a force couple through
  both, and the Coulomb preset uses it (identical to `q_i·q_j` while every `q2` is 0).
- **Isospin** I₃ is a scalar for isospin-dependent forces (e.g. a nuclear term that binds pn
  differently from pp). Species presets (u, d, anti-u, anti-d, p, n, e, positron) fill mass,
  charge, isospin and nuclear charge in the Generator and in scenario files.

## Color charge

A particle stores color amounts (r, g, b); anticolors are negative (anti-red = (−1, 0, 0)).
The physical color vector is `C = r·e_r + g·e_g + b·e_b`, where `e_r`, `e_g`, `e_b` are unit
vectors 120° apart in a 2D plane (the weight diagram of SU(3)). Hence white (1, 1, 1),
baryons (r + g + b) and mesons (color + its anticolor) all have `C = 0`, and

| Pair | `c_dot` |
| --- | --- |
| same color | +1 |
| different colors | −½ |
| color and its anticolor | −1 |
| color and another anticolor | +½ |

These ratios match the diagonal (Cartan) part of SU(3) one-gluon exchange (+1/3 : −2/3 for
quark–quark). Not modeled: off-diagonal gluons, i.e. color charges never swap. The Cornell
preset multiplies the whole potential by `c_dot` (Casimir scaling), so a color–anticolor pair
feels `−α/r + σr` while equal colors repel. In color mode, anticolors are drawn as the
complementary color (anti-red is cyan). Code: `src/engine/colorCharge.ts`.

## GPU notes

- Integer powers up to 8 (`r^-2`, `q^3`) are unrolled into multiplications because GLSL
  `pow()` is undefined for negative bases. Exponents that are parameters or expressions
  (e.g. the `n - 1` from differentiating `(r - r0)^n`) go through `spow()`, which matches
  `Math.pow` for negative bases with integer exponents. A negative base with a
  non-integer exponent gives NaN on both CPU and GPU.
- The pair loop is O(N²) for all forces today; short-range forces only skip the
  evaluation, not the visit. See `tasks/inbox/short-range-neighbor-grid.md`.
