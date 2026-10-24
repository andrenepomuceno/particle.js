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
