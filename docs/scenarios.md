# Scenario files

Every scenario is a JSON file in `src/scenarios/library/`. Files are bundled at build time and
listed in file-name order (hence the numeric prefixes). A file can also be loaded at runtime
with **Import** (<kbd>I</kbd>), which accepts scenario files and snapshots alike; <kbd>R</kbd>
then rebuilds it from the file.

Validation is strict: unknown keys are rejected (so a typo never silently falls back to a
default) and every error names the file and the JSON path, e.g.
`invalid scenario 40-crystal.json at 'groups[0].shape.innerRadius': must be within [0, radius=5), got 5`.
An invalid bundled file stops the app at startup.

## Top level

| Key | Required | Meaning |
| --- | --- | --- |
| `format` | yes | `"particle.js-v2/scenario"` |
| `version` | yes | `1` |
| `id`, `name` | yes | unique id (used in `?scenario=`) and display name |
| `folder`, `description` | no | grouping label (default `Custom`) and one-line description |
| `seed` | no | RNG seed, integer ≥ 0 (default 1); the same seed always rebuilds the same particles |
| `view` | no | `cameraDistance` (1000), `particleRadius` (3), `colorMode` (`charge`) |
| `settings` | no | any subset of `timeStep`, `friction`, `maxSpeed`, `boundary`, `boundarySize`, `restitution`, `mode2D`; the rest keeps the defaults |
| `forces` | no | list of forces (below) |
| `groups` | no | list of particle groups (below) |

## Forces

Either a preset with overrides:

```json
{ "preset": "lennardJones", "cutoff": 30, "softening": 0, "enabled": true, "params": { "epsilon": 5 } }
```

Presets: `gravity`, `coulomb`, `nuclear`, `lennardJones`, `yukawa`, `spring`, `color`, `spinSpin`
(definitions in `src/engine/forces/presets.ts`). Or a full definition:

```json
{ "name": "Screened", "mode": "potential", "range": "short", "cutoff": 50, "softening": 1,
  "expression": "-k * q_i * q_j * exp(-r / l) / r", "params": [{ "name": "k", "value": 1 }, { "name": "l", "value": 10 }] }
```

`enabled` defaults to true, `softening` to 0, `params` to `[]`; `cutoff` is required for short-range
forces. Optional keys must be omitted, not `null`. Expressions are
compiled while loading, so an invalid one fails with its path. The language is in [forces.md](forces.md).

## Particle groups

```json
{
  "count": 900,
  "kind": "dynamic",
  "shape": { "type": "disk", "radius": 350 },
  "velocity": { "type": "random", "speed": { "min": 0, "max": 2 } },
  "mass": 1,
  "charge": { "cycle": [1, -1] },
  "spin": { "choice": [-0.5, 0.5] },
  "parity": 1,
  "color": { "cycle": [[1, 0, 0], [0, 1, 0], [0, 0, 1]] }
}
```

`count` and `shape` are required; `kind` defaults to `dynamic`, `mass` to 1, `charge`, `spin` and
`nuclearCharge` to 0, `parity` to 1, `color` to `[0, 0, 0]`, `velocity` to `still`.

**Sampled values** (`mass`, `charge`, `spin`, `parity`, `nuclearCharge`, `color`, random `speed`):

| Form | Per particle |
| --- | --- |
| `2.5` or `[1, 0, 0]` | the same value |
| `{ "min": a, "max": b }` | uniform in [a, b] (numbers only) |
| `{ "choice": [...] }` | random pick |
| `{ "cycle": [...] }` | `list[index % length]`: exact proportions, e.g. a neutral plasma |

**Shapes** (all accept an optional `center`, default origin):

| `type` | Keys | Placement |
| --- | --- | --- |
| `point` | | all at the center |
| `sphere` | `radius` | uniform in the ball |
| `shell` | `radius` | uniform on the surface |
| `disk` | `radius`, `innerRadius` (0), `thickness` (0) | uniform in the annulus, z within ±thickness/2 |
| `box` | `size` `[x, y, z]` | uniform in the box |
| `grid` | `spacing`, `columns`, `rows`, `layers` (1) | lattice centered on the center; `count` may not exceed the number of sites |

**Velocity**:

| `type` | Keys | Result |
| --- | --- | --- |
| `still` | | zero |
| `constant` | `value` `[vx, vy, vz]` | the same vector |
| `random` | `speed` (sampled) | random direction (in-plane when `mode2D`) |
| `orbit` | `centralMass`, `G`, `center` | circular speed `√(G·M/r)` around the z axis through `center` |

Fixed particles (`"kind": "fixed"`) always start with zero velocity. With `settings.mode2D`, every
position is projected onto z = 0, so 3D shapes collapse into the plane.
