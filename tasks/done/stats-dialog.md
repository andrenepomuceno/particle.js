# Stats dialog with time-series charts

User request: a dialog with charts of energy, velocity, temperature (simulation) and
performance (app/simulation).

- Sampled on the periodic readback (same 1 Hz one that feeds the average speed), ring buffer.
- Simulation: kinetic energy, potential energy (from the compiled force potentials; for
  force-mode expressions no potential exists, so plot kinetic only and say so), total;
  mean/max speed; temperature as 2/3·<KE> (3D) or <KE> (2D) per particle, k_B = 1.
- Performance: FPS, GPU step time (EXT_disjoint_timer_query_webgl2 when available, else
  marked unavailable), steps/s, readback time.
- Line charts with hover readout (follow the dataviz guidance already applied in ForcePlot).

## Result

Done. Statistics dialog with four charts (energy, speed, temperature, performance) built on a
small SVG `LineChart` (legend with values, hover crosshair; dataviz palette slots 1–3 validated
against the panel surface, all-pairs PASS). Potential energy comes from a new GPU pass generated
from the potential ASTs; force-mode forces are named as missing. GPU timer queries were not
used: frame CPU time and the sampling cost are shown instead, labelled as such.
The pass costs ~440–475 ms per sample in SwiftShader, so it runs only while the dialog is open.
The charts immediately exposed the Lennard-Jones crystal scenario exploding (KE 1.1e6, speeds
pinned at the clamp) from overlapping random starts; it now starts on a grid and cools as
expected. Verified: energy conservation unit test for V vs F; headless screenshots.
