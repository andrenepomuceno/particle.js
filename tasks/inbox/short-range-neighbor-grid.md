# Spatial grid for short-range forces

Every pair is visited today (O(N²)), even when all forces are short-range. Build a
uniform grid (cell = max cutoff) on the GPU via sort-by-cell, and loop only over the
27 (or 9 in 2D) neighbor cells for short-range forces. Long-range forces keep the full loop.
Measure steps/s before and after with the benchmark task.
