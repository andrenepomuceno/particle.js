# Adjustable particle count; scenarios regenerate at the chosen size

User request (2026-10-24): like v1, the total number of particles is adjustable and scenarios
adapt automatically on the next generation (v1 scenarios used n = maxParticles, set in the
Information menu, applied on reset).

- A "particles" setting in the Information dialog (persisted per browser), applied on reset or
  scenario load; also raises the GPU capacity when needed (today capacity is fixed by ?capacity).
- Scenario groups scale with it; groups can opt out (e.g. a galaxy's single core). Clusters keep
  their size; grids grow their columns/rows.
- Open design questions asked to the user (density vs region size, default count).
