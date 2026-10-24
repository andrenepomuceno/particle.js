# Benchmark script

`scripts/bench.mjs`: run each scenario headless for a fixed number of steps at several
particle counts and write steps/s to `reports/bench-<date>.json`. SwiftShader numbers
are not GPU numbers: label the renderer string in the report.
