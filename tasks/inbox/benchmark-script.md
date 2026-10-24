# Benchmark script

`scripts/bench.mjs`: run each scenario headless for a fixed number of steps at several
particle counts and write steps/s to `reports/bench-<date>.json`. SwiftShader numbers
are not GPU numbers: label the renderer string in the report.
- The 1 Hz mean-speed sample reads back the velocity texture and stalls the pipeline briefly.
  Replace it with a GPU reduction (log-step downsample of |v|) and measure the hitch first.
