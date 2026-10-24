# Full test suite and coverage gate

Deferred during the MVP phase (user request: focus on the MVP first).

- Raise unit coverage of `src/engine/**` (excluding GPU/render glue) and add a coverage
  threshold to `vite.config.ts` once the number is measured; never lower it afterwards.
- Playwright e2e on Chromium + SwiftShader: boot the app, run N GPU steps, read back and
  compare against `referenceStep` within a float32 tolerance; assert no shader compile errors.
- UI component tests for the force editor (validation messages, recompile on edit).
