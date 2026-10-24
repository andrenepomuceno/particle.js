# Adjustable particle count; scenarios regenerate at the chosen size

User request (2026-10-24): like v1, the total number of particles is adjustable and scenarios
adapt automatically on the next generation (v1 scenarios used n = maxParticles, set in the
Information menu, applied on reset).

- A "particles" setting in the Information dialog (persisted per browser), applied on reset or
  scenario load; also raises the GPU capacity when needed (today capacity is fixed by ?capacity).
- Scenario groups scale with it; groups can opt out (e.g. a galaxy's single core). Clusters keep
  their size; grids grow their columns/rows.
- Open design questions asked to the user (density vs region size, default count).

## Result

Done. Information → "Particles (next reset)" (persisted) sets `particleTarget`; scenario groups scale
at constant density via `src/scenarios/scaling.ts` (user decision 2026-10-24: keep density, not
region), `"scale": false` pins groups (galaxy core), clusters stay whole, grids add sites; boundary
and camera follow the length factor; GPU capacity is rebuilt when the target exceeds it (up to
2048²). Verified: 6 scaling unit tests; in headless Chromium galaxy 3001 → 20001 particles,
capacity 16384 → 20164, camera 1400 → 3615, finite state, back to 3001 on "scenario default".
