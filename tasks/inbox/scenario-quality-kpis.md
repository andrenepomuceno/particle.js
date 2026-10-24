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
