# Forces

## Model

Classical mechanics by default; the Minkowski metric (Spacetime dialog, see
[Spacetime metric](#spacetime-metric)) turns on special relativity. For particles *i* and *j* at
distance *d*, each enabled force contributes a signed scalar `F` along `(x_i − x_j) / d`:

- `F > 0` pushes the pair apart, `F < 0` pulls it together.
- **Long range**: applied at every distance.
- **Short range**: applied only when `d < cutoff`. The cut is hard (no smoothing), so a
  potential that is not zero at the cutoff produces a force step there.
- **Softening** ε: the expression receives `r = √(d² + ε²)`; the direction still uses the
  real `d`. Use it to keep `1/r²`-type forces finite at close range. In force mode `F(r)` is
  applied as written. In potential mode the force is the exact gradient of the softened V:
  `F = −dV/dd = −V'(r)·d/r` (Plummer softening), so energy is conserved even inside ε.
- Coincident particles (`d = 0`) do not interact.

Two integrators (Parameters → Integrator), both one force evaluation per step:

- **Velocity Verlet** (default, 2nd order, time-reversible): `x += v·dt + ½·a·dt²`, then
  `a' = ΣF(x')/m` (at time t + dt, clocks already advanced), then `v += ½(a + a')·dt`.
  The previous acceleration is kept on the GPU and recomputed after any edit.
- **Semi-implicit Euler** (1st order, v1's scheme): `v += (ΣF / m)·dt`, then `x += v·dt`.

After the velocity update both apply friction `v *= e^(−friction·dt)`, v1's quadratic drag
`v /= 1 + quadraticDrag·dt·|v|/m` (mass-scaled, 0 = off), the optional speed clamp,
then boundary reflection (a sphere of radius `boundarySize`, or a box of half-size `boundarySize`
in x and y and `boundaryDepth` in z — a slab when thinner; 0 = cubic). Fixed particles never move; every clock `t` advances by `dt`
(by the proper time `dt/γ` under Minkowski).
Measured on a gravitational binary over t = 200 (relative energy error): Euler 7.3e-3 / 1.4e-3,
Verlet 2.3e-4 / 9.0e-6 at dt = 0.5 / 0.1. `src/engine/cpu/referenceStep.ts` is the executable
specification of both, and `npm run parity` checks the GPU against it.

## Spacetime metric

Settings `metric` (`galilean`, the default, or `minkowski`) and `lightSpeed` (c), in the
**Spacetime** dialog or a scenario's `settings`.

- **Galilean**: classical mechanics as above. c is kept but nothing reads it.
- **Minkowski**, dτ² = dt² − |dx|²/c²: special relativity. The velocity textures hold the proper
  velocity u = dx/dτ = γv, with γ = √(1 + |u|²/c²). Forces change the momentum p = m·u: du/dt = F/m. Particles
  move with v = u/γ, so |v| < c follows from the dynamics, and the speed clamp `maxSpeed` must be 0
  (the combination is refused). Each clock `t` is the particle's proper time and advances by
  dτ = dt/γ, so moving clocks run slow.
- Verlet becomes kick-drift-kick on u: the drift is `dt·v(u + ½·a·dt)`, with a = F/m,
  identical to `v·dt + ½·a·dt²` when Galilean. The implicit kick for velocity forces solves for Δu
  with ∂F/∂u = ∂F/∂v · ∂v/∂u, where ∂v/∂u = (I − v·vᵀ/c²)/γ.
- Expressions still see the coordinate velocity: `v_i`, `v_j` and the shorthands are dx/dt. The
  Lorentz force q(E + v × B) written with them is already the relativistic one, because dp/dt = F
  holds with p = γmv. `c_light` is the configured c, so a magnetic coupling k/c² (the *Magnetic*
  preset) follows the dialog: Coulomb + Magnetic is the full electromagnetic pair force to order v²/c².
- Friction, quadratic drag, boundary reflection, the B/T/Y keys and collisions act on u.
  Collisions conserve momentum exactly, and two equal masses colliding head-on swap momenta,
  which is the exact elastic result; otherwise the relativistic energy is only approximately
  conserved.
- The energy chart's kinetic energy is (γ − 1)·m·c², which equals ½·m·v² when Galilean. Speeds
  are coordinate speeds.
- Still instantaneous: pair forces act at equal lab time (Δt = 0), so distances are Euclidean.
  The light cone (retarded interactions) is not modelled.
- Changing the metric or c keeps every particle's v. If a particle would be at or above the new
  c, the change is refused.

## Writing an expression

Mode **force**: the text is `F(r)`. Mode **potential**: the text is `V(r)` and the engine
uses `F = −dV/dr`, differentiated exactly by shader-autodiff (no finite differences). In a
short-range potential `x` is expanded to `r / cutoff` before differentiating.

**Vector potentials.** A potential that reads the relative position `dx`, `dy`, `dz`
(Δx = x_i − x_j) or the spin projections `si_r`, `sj_r` is a function of Δx, and its force is the
full gradient `F_i = −∇_Δx V`, not a magnitude along r̂: non-central forces such as the magnetic
dipole–dipole interaction. `r` inside it is `√(Δx² + ε²)`, so softening gives the exact gradient
of the softened V (Plummer), as for central potentials. With fixed spins V depends on positions alone, so energy is conserved;
momentum is conserved when V is symmetric under swapping the particles (Δx → −Δx with i ↔ j),
as the dipole is. Orbital angular momentum is not (the torque on the spins is not modelled).
`dx`, `dy`, `dz` are rejected in force mode.

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
| `si_r`, `sj_r` | `s_i·r̂`, `s_j·r̂`, with r̂ pointing from j to i (vector force in a potential) |
| `dx`, `dy`, `dz` | relative position x_i − x_j (potential mode: vector force) |
| `i3_i`, `i3_j` | isospin projection I₃ (u: +½, d: −½) |
| `p_i`, `p_j` | parity |
| `n_i`, `n_j` | nuclear charge (v1's coupling for the nuclear force) |
| `cr_*`, `cg_*`, `cb_*` | color charge amounts (r, g, b) as stored |
| `cx_*`, `cy_*` | color vector in the 120° weight plane |
| `c_dot` | color factor `C_i · C_j` (see below) |
| `t_i`, `t_j` | particle clocks (proper times under Minkowski) |
| `time` | global simulation time |
| `c_light` | speed of light c (Spacetime dialog), also while Galilean: e.g. the magnetic coupling k/c² |
| `rand` | uniform random number in [0, 1), new each step, shared by the pair (force mode; see *Random numbers*) |
| `randn` | standard normal random number, new each step, shared by the pair |
| `randv` | vector of three independent standard normals, new each step, shared by the pair |

`_i` is the particle receiving the force, `_j` the one exerting it. Any other name must be
declared as a parameter of the force. Parameters are GPU uniforms: editing their values
never recompiles. Editing the expression, mode, range, enabled flag or the parameter
*names* recompiles the velocity shader.

Validation reports every problem at once (unknown variables, bad parameter names,
non-positive cutoff, …). A force with errors is skipped; the others keep running.

## Vectors and velocity

Expressions may mix numbers and vectors. Vectors: `d` (Δx = x_i − x_j), `rhat` (d / |d|), `s_i`,
`s_j` (spins), `v_i`, `v_j` (velocities), `randv` (random) and `vec(a, b, c)`; scalar components
`vx_i`… are also available. Vectors combine with `+`/`−` between vectors, `*`/`/` by numbers, and
`cross`, `dot`, `length`, `normalize`; anything else (vector × vector, `sin(d)`, a vector exponent)
is rejected with a hint. Shorthands: `v_dot` = (v_i − v_j)·r̂ (negative while approaching), `v_rel` = |v_i − v_j|,
`vv_dot` = v_i·v_j.

In **force mode** a vector result is applied as the force on i itself, so non-central and
velocity-dependent laws can be written directly:

| Law | Expression |
| --- | --- |
| Lorentz force in a uniform field, from one source particle marked `n = 1` (a pair force sums over every j) | `n_j * q_i * cross(v_i, vec(0, 0, B))` |
| Field of a magnetic dipole s_j on a moving charge | `q_i * cross(v_i, k * (3 * dot(s_j, rhat) * rhat - s_j) / r^3)` |
| Biot–Savart between moving charges (parallel currents attract) | `k * q_i * q_j / r^3 * cross(v_i, cross(v_j, d))` |
| Pair drag (damps the closing speed) | `-c * v_dot` (a number: central) |
| Pair noise (DPD random force, momentum-conserving) | `sigma * (1 - x) * randn` (short range) |

Velocity is refused in potential mode (F = −∇V needs a V of positions). A force that reads `v_i`
is integrated with an implicit-midpoint velocity update: shader-autodiff also yields ∂F/∂v_i, and
each step solves (I − dt/2m·J)·Δv = dt/m·F. For F = q v × B this is exactly the Boris rotation, so
speeds stay constant and magnetic forces do no work. Any force that reads a velocity (v_i or v_j)
runs with this Euler step, since Verlet assumes position-only forces (the force card says so).
Biot–Savart violates
Newton's third law, as it does classically without field momentum.

## Random numbers

`rand` (uniform in [0, 1)), `randn` (standard normal) and `randv` (three independent standard
normals, a vector) give every pair new numbers at every force evaluation. They are variables, not
calls: `randn` read twice, in one expression or in two forces of the pair, is the same number.

- **Deterministic**: each value is a 32-bit integer hash of the unordered pair {i, j} (particle
  indices), the evaluation time as float32 bits and a stream number per value: PCG's `pcg_hash`
  (Jarzynski & Olano, *Hash Functions for GPU Rendering*, 2020) nested over the inputs. A uniform is
  the hash's top 24 bits times 2⁻²⁴ (exact in float32), a normal comes from two uniforms by
  Box–Muller (with 1 − u in the log, never 0, so |randn| ≤ 5.8). `src/engine/noise.ts` holds both
  the JS and the GLSL version; they give the same bits, so the GPU and the float64 reference draw the
  same numbers and a run replays exactly from the same state. Forces are evaluated at the step's time
  t (Euler) and, in Verlet's second pass, at t + dt, so every step draws new numbers while the step
  exceeds the float32 resolution of the time (t < dt·2²³, about 8 million steps).
- **Symmetric in i and j**: both particles of a pair read the same numbers, so a central random
  force such as `sigma * randn` is equal and opposite on the pair (r̂ flips) and conserves momentum,
  like the random force of dissipative particle dynamics (DPD). With a pair drag `-gamma * v_dot` it
  is a thermostat: drag and noise balance near T = sigma²·dt/(2·gamma) (k_B = 1), also with DPD's
  weights `sigma * (1 - x) * randn` and `-gamma * (1 - x)^2 * v_dot` (scenario *DPD Thermostat*).
  The noise is drawn once per step and not scaled by 1/√dt, so that temperature is proportional to dt.
- `randv` is the same vector for both particles of the pair, so `k * randv` pushes them the same way
  and does not conserve momentum. It suits a random field from one source particle marked with
  `n_j` (as the *Cyclotron* scenario does for uniform fields): `c * n_j * randv`.
- **Force mode only**: potential mode refuses them, as it refuses velocities (F = −∇V needs a V of
  the positions). They do not depend on v_i, so the Jacobian ∂F/∂v_i treats them as constants.
- **Field probes and plots use the mean**: `rand` = ½, `randn` = 0, `randv` = (0, 0, 0) for the
  field's test particle (GPU and `referenceField`) and in the force plots, so they stay still.
- The pair loop hashes only the values some force reads, and only for pairs inside the range of a
  force that reads them.
- A pair drag reads v_i, so it runs with the implicit Euler step, whose Jacobian is per particle
  (∂F_i/∂v_i, not the partner's velocity): momentum is then exact for an isolated pair of equal
  masses but drifts slightly, O(dt²) per step, among many neighbors.

## Examples

| Force | Mode | Range | Expression |
| --- | --- | --- | --- |
| Gravity | force | long | `-G * m_i * m_j / r^2` |
| Coulomb | force | long | `k * q_dot / r^2` |
| Magnetic (Biot–Savart) | force (vector) | long | `k * q_i * q_j / (c_light^2 * r^3) * cross(v_i, cross(v_j, d))` |
| v1 nuclear | force | short | `k * n_i * n_j * sin(2 * pi * x)` |
| Lennard-Jones | potential | short | `4 * epsilon * ((sigma / r)^12 - (sigma / r)^6)` |
| Yukawa | potential | short | `-g^2 * exp(-r / lambda) / r` |
| Spring | potential | short | `0.5 * k * (r - r0)^2` |
| Cornell (color) | potential | short | `c_dot * (alpha / r - sigma * r)` |
| Spin dipole | potential (vector) | short | `k * (s_dot - 3 * si_r * sj_r) / r^3` |

All of them are presets in the Forces dialog (`src/engine/forces/presets.ts`).

## Collisions

Parameters → *Collision distance* (0 = off, as in v1) and *Collision restitution* (1 elastic,
0 perfectly inelastic). In each velocity update, every pair closer than the distance that is
still approaching gets the impulse `Δv_i = −(1 + e)·m_j/(m_i + m_j)·((v_i − v_j)·n̂)·n̂` (n̂ from j
to i); a fixed partner acts as infinite mass (`Δv_i = −(1 + e)·((v_i − v_j)·n̂)·n̂`). All pairs use
the same pre-step velocities: an isolated pair conserves momentum (and kinetic energy for e = 1)
exactly, while simultaneous contacts among three or more particles are resolved pairwise and only
approximately (as in v1). The distance acts as a contact radius: an approaching pair inside it
contributes no force that step (the impulse replaces it), and an overlapping pair at rest or
separating feels the force evaluated at the contact distance, so repulsion pushes it apart while
attraction stays bounded instead of growing as 1/r². The energy chart's potential still counts
pairs inside the distance, so with collisions on the total is not a conserved quantity. Both
integrators apply the impulse (Verlet after its drift); field probes ignore collisions.

## Spin, 2D charge and isospin

- **Spin** is a fixed 3D vector per particle. Expressions can depend on its orientation
  (`s_dot`, `si_r`, `sj_r`); spins never rotate (no torque or precession). The *Spin dipole*
  preset is the magnetic dipole–dipole energy in potential mode, so its force is the full,
  non-central −∇V (see *Vector potentials*) and the energy chart includes it. In force mode,
  `si_r`/`sj_r` only shape a central magnitude.
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

- Expressions compile through shader-autodiff: shared subexpressions are computed once and
  integer powers (`r^-12`, `q^3`, up to ±1024) are unrolled by repeated squaring. Other powers go
  through `spow()`, which matches `Math.pow` for negative bases with integer exponents (GLSL
  `pow()` is undefined there). A negative base with a non-integer exponent gives NaN on CPU and GPU.
- Constants must fit float32 (|c| between 1.2e-38 and 3.4e38, or 0); others are rejected, since
  the GPU would see 0 or ∞ while the float64 reference would not. Rescale the units instead.
- Parameter names may not clash with GLSL/WGSL/JS keywords or the library's built-ins (`input`,
  `mix`, `E`, …); the editor reports the clash.
- The pair loop is O(N²) for all forces today; short-range forces only skip the
  evaluation, not the visit; a neighbor grid is planned.
