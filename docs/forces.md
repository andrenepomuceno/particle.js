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

Per step, for each dynamic particle: `v += (ΣF / m)·dt`, then friction `v *= e^(−friction·dt)`,
then the optional speed clamp, then boundary reflection; afterwards `x += v·dt`. Fixed
particles never move. Every particle's clock `t` advances by `dt`.
`src/engine/cpu/referenceStep.ts` is the executable specification of this order.

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
| `q_i`, `q_j` | electric charge |
| `s_i`, `s_j` | spin (scalar) |
| `p_i`, `p_j` | parity |
| `cr_*`, `cg_*`, `cb_*` | color charge components |
| `c_dot` | `c_i · c_j` |
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
| Coulomb | force | long | `k * q_i * q_j / r^2` |
| v1 nuclear | force | short | `k * sin(2 * pi * x)` |
| Lennard-Jones | potential | short | `4 * epsilon * ((sigma / r)^12 - (sigma / r)^6)` |
| Yukawa | potential | short | `-g^2 * exp(-r / lambda) / r` |
| Spring | potential | short | `0.5 * k * (r - r0)^2` |
| Cornell (color) | potential | short | `alpha * c_dot / r + sigma * r` |
| Spin-spin | force | short | `k * s_i * s_j * p_i * p_j / r^4` |

All of them are presets in the Forces dialog (`src/engine/forces/presets.ts`).

## GPU notes

- Integer powers up to 8 (`r^-2`, `q^3`) are unrolled into multiplications because GLSL
  `pow()` is undefined for negative bases. Other exponents use `pow()` and, like
  `Math.pow`, give NaN for a negative base.
- The pair loop is O(N²) for all forces today; short-range forces only skip the
  evaluation, not the visit. See `tasks/inbox/short-range-neighbor-grid.md`.
