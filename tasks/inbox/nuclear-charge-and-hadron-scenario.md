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
