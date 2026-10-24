# particle.js v2

![Color confinement scenario](docs/img/quarks.png)

A classical n-body particle simulator that runs in the browser. You write the forces:
each one is an expression such as `k * q_i * q_j / r^2` or a potential such as
`4 * epsilon * ((sigma / r)^12 - (sigma / r)^6)`, short or long range. The expression is
compiled to GLSL and every particle pair is evaluated in parallel on the GPU.

Successor of [particle.js](https://github.com/andrenepomuceno/particle.js), rewritten from scratch.

## Features

- **Custom forces**: any number of pair forces, each with its own expression, parameters,
  range (long, or short with a cutoff) and softening. Change a parameter and the GPU picks
  it up on the next frame; change the expression and the shader is recompiled and
  validated before it replaces the old one.
- **Force or potential**: write `F(r)` directly, or write `V(r)` and get `F = −dV/dr`, differentiated
  exactly by [shader-autodiff](https://github.com/andrenepomuceno/shader-autodiff).
- **Vectors and velocity**: expressions may be vectors (`cross(v_i, B)`, `d`, `s_j`, …); a vector force
  is applied as written, and velocity-dependent ones (v × B) get an exact implicit step.
- **Vector forces**: a potential of the relative position (`dx`, `dy`, `dz`, or the spin projections)
  gives the full gradient −∇V, so non-central forces like the magnetic dipole are exact.
- **Rich particles**: position, velocity, own clock, mass, 2D charge, spin vector, isospin, parity, nuclear charge
  and a color charge modeled with three base vectors 120° apart, all usable in expressions.
- **Statistics**: energy, speed, temperature and performance charts.
- **Force field view**: a grid of arrows showing the net force a configurable test particle
  would feel, computed on the GPU by the same generated force code (<kbd>J</kbd>, <kbd>F</kbd> to re-fit).
- **Live plot** of each force as the integrator applies it (softening and cutoff included).
- **v1 look**: spheres with a velocity arrow through them, colored by charge, color charge or speed.
- **v1-style interaction**: keyboard shortcuts, draggable dialogs, click to inspect and
  edit a particle, shift+drag to select, copy and place groups, particle generator.
- **JSON scenarios**: shapes, sampled attributes, presets or custom forces, all in one file.
- **Snapshots**: export the full state (forces, settings, particles) to JSON plus a PNG,
  and import it back with field-by-field validation.
- **Adjustable particle count**: scenarios regenerate at the chosen size, keeping their density.
- 2D and 3D modes, sphere or box boundaries, friction, optional speed clamp.

## Quick start

Requires Node.js 22+ and a browser with WebGL2 and `EXT_color_buffer_float`.

```
npm install
npm run dev
```

Open the printed URL. An About dialog (also in the top menu) explains the basics on the first visit. Press <kbd>?</kbd> for the shortcut list. URL options:
`?scenario=quarks` picks the starting scenario, `?capacity=65536` raises the particle
limit (default 16384).

## Physics in one paragraph

Classical mechanics. For every pair, each enabled force contributes a signed magnitude
`F(r)` along the line joining the particles; **positive pushes them apart**. Short-range
forces are zero beyond their cutoff; softening ε replaces `r` with `√(r² + ε²)` inside the
expression. Particles advance with velocity Verlet (default) or semi-implicit Euler. Details: [docs/forces.md](docs/forces.md).

## Scenarios

Scenarios are JSON files in `src/scenarios/library/` (format: [docs/scenarios.md](docs/scenarios.md));
you can also load your own with <kbd>I</kbd>.

| Scenario | Forces | What to look for |
| --- | --- | --- |
| Galaxy disk | gravity | a fixed core with 3000 bodies on near-circular orbits |
| Neutral plasma | Coulomb + weak gravity | ± charges in a reflecting sphere |
| Nuclear clusters | short-range sine + Coulomb | v1's nuclear force, nucleons clumping in 2D |
| Lennard-Jones crystal | LJ potential | a cooling gas condensing into a lattice |
| Dipole Chains | spin dipole (vector force) + repulsive core | a 2D ferrofluid: in-plane dipoles join head to tail into chains |
| Dipole Crystal | spin dipole (vector force) + repulsive core | perpendicular dipoles repel into a triangular lattice; flipped ones bind defects |
| Radiation Belt | dipole magnetic field, q v × B | charges gyrate, mirror between the poles and drift around a magnetized planet |
| Cyclotron and E×B Drift | uniform E and B + Coulomb | electrons and ions gyrate opposite ways, yet the plasma drifts together at E/B |
| Beam Pinch | Coulomb + Biot–Savart | a slow beam blows apart while a fast one self-focuses (magnetic attraction ∝ v²) |
| Color confinement | Casimir-scaled Cornell potential, 120° color charge | quarks pairing into color-neutral mesons and baryons |
| Quarks to nuclei | color + v1 nuclear force + Coulomb + quark core | quark triplets bound into molecules and ring-shaped nuclei |
| Welcome *(v1)* | v1 force map 2 + v1 color + Coulomb | "Welcome to particle.js !" written in quark nuclei |
| The Egg *(v1)* | v1 force map 2 + v1 color + 1/d Coulomb + 1/d gravity | a quark soup scripted like v1: G jumps 1e41-fold, the soup collapses, rebounds and settles into an egg |
| Gravity *(v1)* | 1/d gravity | a rotating annulus of 10000 bodies collapsing into clumps |
| Experiments 4 *(v1)* | v1 force map 2 + v1 color + 1/d Coulomb + 1/d gravity + v1 drag | The Egg's sibling, scripted: G jumps 1e41-fold, the soup collapses into a lattice of nuclei whose rim later evaporates |
| Hexagonal Crystal, force map *(v1)* | v1 eight-step force map + Coulomb + v1 drag | a honeycomb of 96 carbon-like quark atoms settling in place |
| Air *(v1)* | v1 powAXv3 nuclear + Coulomb | a lattice of N, O and Ar atoms made of quarks and electrons |
| Water 2 *(v1)* | v1 powAXv3 nuclear + Coulomb | a lattice of H2O molecules made of quarks and electrons |
| Essential Elements *(v1)* | v1 powAXv2 nuclear + Coulomb | H, C, N, O and traces of metals, 10% antimatter |
| Periodic Table *(v1)* | v1 powAXv3 nuclear + Coulomb | elements Z = 1…64 of protons, neutrons and electrons |
| Hexagonal Crystal, Tetragonal Crystal *(v1)* | v1 powAX nuclear + Coulomb | neutral quark atoms on a honeycomb or square lattice, nuclear charge alternating |
| Hydrogen, Helium, Water *(v1)* | v1 force map 2 + 1/d Coulomb | single atoms and a molecule with orbiting electrons |
| Super Nucleus 3D *(v1)* | v1 powAX nuclear + Coulomb + gravity | 10000 particles burst from a point and gather into giant 3D nuclei |
| Plasma Ball *(v1)* | v1 powAX nuclear + weak Coulomb + gravity | a burst from a point filling a reflecting sphere with 3D plasma |
| Strong Blob *(v1)* | v1 nuclear sine + 1/d Coulomb | a 3D ball of ± nuclear charges clumping into blobs |
| Standard Model *(v1)* | v1 powAX nuclear + Coulomb | 10000 neutrinos, electrons and quarks with ± nuclear charge |
| Standard Model 1 *(v1)* | v1 powAX nuclear + Coulomb | electrons and quarks bursting from a point across the 1e6 nuclear range |
| Wild Particles *(v1)* | v1 sine nuclear + Coulomb + gravity | five particle kinds flung around a reflecting circle |
| Planetoid Formation *(v1)* | v1 force map 1 + 1/d Coulomb + 1/d gravity | text of deuterons collapsing into a planetoid; v1's script squeezes it with 16× gravity, then pulls the camera back |
| Hexagon 1, 2, 3 *(v1)* | v1 sine nuclear + Coulomb | electron beams shot through tilted honeycombs of tiny nuclei (1, 3); two honeycombs colliding (2) |
| Terrarium *(v1)* | v1 sine nuclear spanning the arena + Coulomb | light neutral particles swirling around clumps of heavy charges |
| Sandbox | gravity + Coulomb | empty; press <kbd>G</kbd> to generate particles |

## Development

```
npm run check      # typecheck + lint + unit tests
npm run smoke:all  # headless Chromium: every scenario + interaction smoke test
npm run build      # production bundle in dist/
```

Release notes: [CHANGELOG.md](CHANGELOG.md). More in [docs/development.md](docs/development.md). Documentation index: [docs/README.md](docs/README.md).

## Thanks

[three.js](https://threejs.org/) for the WebGL layer.
