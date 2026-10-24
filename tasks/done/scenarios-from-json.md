# Scenarios parameterized by JSON files

User request: scenarios defined in JSON instead of code.

- One `.json` per scenario: metadata, seed, view (camera, radius, color mode), settings,
  forces (preset + overrides, or full definition) and particle groups (shape, count,
  sampled attributes: fixed / {min,max} / {choice} / {cycle}; velocity random or orbital).
- Strict validation with the JSON path of the failing field; unknown keys rejected.
- Bundled files loaded at build time; Import (I) also accepts a scenario file.
- Shared JSON readers in `src/engine/json.ts` (started), reused by `snapshot.ts`.
- Port the six current scenarios; document the format in `docs/scenarios.md`.
