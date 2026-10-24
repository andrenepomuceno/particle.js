# Scenarios parameterized by JSON files

User request: scenarios defined in JSON instead of code.

- One `.json` per scenario: metadata, seed, view (camera, radius, color mode), settings,
  forces (preset + overrides, or full definition) and particle groups (shape, count,
  sampled attributes: fixed / {min,max} / {choice} / {cycle}; velocity random or orbital).
- Strict validation with the JSON path of the failing field; unknown keys rejected.
- Bundled files loaded at build time; Import (I) also accepts a scenario file.
- Shared JSON readers in `src/engine/json.ts` (started), reused by `snapshot.ts`.
- Port the six current scenarios; document the format in `docs/scenarios.md`.

## Result

Done. Six scenarios ported to `src/scenarios/library/*.json`, loaded with `import.meta.glob`
and parsed by `src/scenarios/scenarioFile.ts` (strict keys, JSON-path errors). Import (I)
dispatches on `format` and accepts scenario files; R now rebuilds imported scenarios and
re-imports snapshots (it used to throw after a snapshot import). Snapshot parsing moved onto
the shared `JsonReader`, `readSettings` and `readForce`. Format documented in `docs/scenarios.md`.
Verified: 29 scenario unit tests; `npm run smoke:all` 6/6 scenarios ok, 17/17 interaction checks.
