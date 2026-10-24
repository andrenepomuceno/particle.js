# Automated scenario quality KPIs

User request (2026-10-24): automated KPIs for scenario quality, cheap to compute. Motivation: the
user wants scenarios "without physical sense or interesting emergence" discarded; a KPI table should flag
such scenarios (and regressions in the good ones) without anyone watching them.

## Design

`npm run scenario-kpis [--scenario id,...|all] [--steps n]` on the GPU (scripts/lib/browser.mjs),
one page at a time. Every K steps read particles back (already used by parity) and compute O(N)
metrics in the page; print a table and write `reports/kpis.json`.

Per scenario, over a short horizon (default a few thousand steps):
- **Health**: all state finite; fraction of particles that left the boundary / went past 10× the
  initial radius (escapes); speed-clamp hits if maxSpeed is set.
- **Activity**: kinetic energy ratio end/start and its trend — flags frozen (≈ 0 motion) and
  exploding (unbounded growth) worlds.
- **Structure / emergence**: cluster count by a linking-length grid hash (O(N)); change of cluster
  count and of largest-cluster fraction over time — "something formed" vs. "stays a uniform gas".
- **Energy drift** for scenarios whose forces are all potentials (energy.ts already exists).
- **Visibility**: fraction of particles inside the initial camera view at the end.

Thresholds per KPI give pass / warn; scenarios may declare expected behavior (e.g. "gas" vs
"clusters") later if one rule does not fit all. Cost target: whole library well under a minute.

## Result

`npm run kpis` (scripts/scenario-kpis.mjs): per scenario, GPU run of `--steps` (2000) steps, O(N)
metrics at start/half/end in the page: finite state, escapes (> 10× the initial rms radius),
crossings (mean speed × time / rms: frozen < 1e-3, runaway > 100; a kinetic-energy ratio is
meaningless for scenes starting at rest), clusters by a hash grid at half the mean spacing (count
and largest fraction → a structure score), visibility at start (framing) and end. Whole library in
~75 s. Exit 1 only on non-finite state; the rest are warnings (hints, not verdicts: lattice
formation and collective drifts do not register as clusters).

First run findings: Water 2 and Essential Elements started 3% / 38% visible → cameras fixed.
Open: Strong Blob and Standard Model show runaway speeds and 25–50% escapes (to review with the
favorite-scenarios port); The Egg, Air, Nuclei spread out of view over time (physical).
