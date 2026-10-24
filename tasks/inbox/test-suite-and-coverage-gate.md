# Full test suite and coverage gate

Deferred during the MVP phase (user request: focus on the MVP first).

- Raise unit coverage of `src/engine/**` (excluding GPU/render glue) and add a coverage
  threshold to `vite.config.ts` once the number is measured; never lower it afterwards.
  `snapshot.ts`, `presets.ts`, `random.ts` and the scenarios have no unit tests yet.
- Turn `scripts/smoke-interaction.mjs` and `scripts/snap.mjs` into a Playwright suite
  (Chromium + SwiftShader) and add a GPU-vs-`referenceStep` parity check: run N steps,
  read back, compare within a float32 tolerance.
- UI component tests for the force editor (validation messages, recompile on edit).
