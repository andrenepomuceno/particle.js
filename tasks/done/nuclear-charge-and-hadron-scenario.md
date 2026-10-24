# Nuclear charge attribute + quark/nucleon scenario

User request: keep v1's nuclear force concept and combine it with the strong (color) force,
so one run shows triplets (protons, neutrons) and, at a larger scale, molecules/crystals of
triplets.

- Add per-particle nuclear charge `n` (v1 `nuclearCharge`) in the free `color.w` slot;
  expose `n_i`, `n_j`; editable in Particle/Generator dialogs, scenario files, snapshots.
  Default 0 (no silent coupling); scenarios set it explicitly.
- Nuclear preset becomes `k * n_i * n_j * sin(2 * pi * x)` (v1: F = n_i·n_j·V(d)·H(range − d)).
- Scenario "Quarks to nuclei": u (+2/3) and d (−1/3) quarks in color cycles; Cornell with a
  baryon-sized cutoff; nuclear sine with a cutoff a few baryon radii wide; Coulomb.
  Tune scales iteratively in the browser; document the chosen numbers and why.

## Result

Done: nuclear charge `n` (commit "add per-particle nuclear charge"), nuclear preset
`k * n_i * n_j * sin(2*pi*x)`, and scenario `55-hadrons.json` ("Quarks to nuclei"), tuned with
`scripts/cluster-stats.mjs` (link 5 = triplet, link 30 = nucleus). What each step showed:

| Change | Result at t≈10 / t≈150 |
| --- | --- |
| random quarks, color cutoff 12 | 261 lone quarks, then 82-quark blobs, 7 triplets |
| pre-formed triplets inside radius 2 | triplets blew apart: overlapping quarks stored ~344 in the core vs a ~25 color well |
| Coulomb k=100 vs color α=20 | u–u Coulomb (≈6.5) beat color (≈3) inside the triplet; α raised to 200, core k to 500, dt 0.05 |
| `cluster` places members on an equilateral ring | 113 neutral triplets at t=11 |
| nuclear k=10 | infall energy shattered triplets: the sine's repulsive barrier (~7k) is always lower than its well (~12.7k) |
| nuclear k=3, friction 0.1, color cutoff 5 | stable molecules of 3–5 separated triplets and ring-shaped nuclei by t=60 |

Known limit: v1's sine has no saturation, so large nuclei form ring shells where neighboring
triplets touch (link-5 clusters of 27–80 quarks). Fixing it needs a stronger short-range
baryon repulsion than the sine provides, which is a physics choice for the user.
Scenario format gained `cluster: { size, radius }`.
