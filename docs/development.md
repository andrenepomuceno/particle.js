# Development

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run check` | typecheck + lint + unit tests (`scripts/check.mjs`); run before every commit |
| `npm test` | unit tests only (Vitest, Node, no GPU) |
| `npm run snap -- --scenario a,b --wait ms [--press j] [--lang pt-BR]` | headless Chromium screenshots to `reports/screenshots/` (`--press` sends keys first, e.g. `j` for the force field; `--lang` picks the interface language, English by default, and suffixes the file name); fails on console/shader errors or non-finite state |
| `npm run smoke` | drives keyboard and mouse gestures headlessly, prints PASS/FAIL per gesture |
| `npm run parity` | runs the same steps on the GPU and on the float64 `referenceStep` inside the page, and the field probe pass against `referenceField`; fails above a float32 tolerance |
| `public/v1/` | the frozen v1 build served at `/v1/` (see its FROZEN.md); never edited, excluded from lint |
| `npm run kpis` | scenario quality KPIs on the GPU (health, escapes, runaway speeds, clusters, framing); table + `reports/kpis.json`; `--scenario id,…` and `--steps n` |
| `npm run snap:library` | every bundled scenario through `snap` (heavier: several have ~10k particles) |
| `npm run smoke:all` | `parity`, every scenario through `snap`, `smoke`, then a short `record` of dipole-antenna replayed for determinism |
| `npm run record -- --scenario id --seconds s --size WxH [--seed s] …` | offline, frame-locked video of a scenario (VP9 WebM and/or PNGs, metadata JSON, captions as WebVTT); see [recording.md](recording.md) |
| `node scripts/cluster-stats.mjs --scenario id --link 5,30 --at 10,60` | runs a scenario headless and reports cluster sizes and color neutrality at each time; used to tune bound-state scenarios |
| `npm run build` | typecheck + production bundle in `dist/` |

The browser scripts use Playwright's Chromium on the real GPU (ANGLE on the system OpenGL; on
WSL2 that is Mesa over D3D12, preferring the NVIDIA adapter) and fail if they get a software
renderer instead. CI has no GPU and uses SwiftShader (software WebGL2, CPU-bound and orders of
magnitude slower). Each run prints its renderer. `PARTICLE_GL=hardware|software` forces a backend
and `PARTICLE_GPU_ADAPTER=<name>` picks another D3D12 adapter (e.g. `Intel`). Frame rates are only
meaningful on hardware. Pages open in English (`en-US`) whatever the machine's language, since the
checks find controls by their English names; the smoke test then switches to Portuguese and checks
every open dialog still renders.

## Interface languages

The interface is in English and Brazilian Portuguese (`src/i18n/`), with no i18n library:

- `en.ts` is the source catalog and defines its type, `Messages`; `ptBR.ts` must have the same shape,
  so a missing or extra entry fails the typecheck (`tests/i18n.test.ts` also checks the shape, empty
  strings and markup). Entries that take values are functions (`selected: (n) => …`), which also
  handle plurals. Help text may carry `<kbd>`, `<b>`, `<i>` and `<code>`, rendered by
  `ui/components/Rich.tsx` (never as HTML).
- The language is controller state (`state.locale`, `setLocale`), so the views read the catalog with
  `useMessages()` and the controller's notices with `controller.messages`; there is no module-level
  current language.
- Bundled scenarios read in the interface language from `ptBR.scenarios.ts` (names and descriptions by
  id, folders, and timeline captions by their English template); expression variables from
  `ptBR.variables.ts`. Each scenario and variable translation carries `source`, a fingerprint of the
  English it translates; tests fail when one is missing or its English has changed since (printing the
  new fingerprint), and captions and folders are keyed by their English text, so **a new or changed
  scenario needs its pt-BR text in the same commit**. Imported and edited files show their own text.
- Kept in English on purpose: engine and validation messages (they quote paths and expressions), force
  names (data that timelines refer to), the repository docs and the frozen v1.

Adding a language: a catalog of type `Messages`, an entry in `LOCALES`, `LOCALE_NAMES` and the
catalog/scenario/variable tables in `src/i18n/`, `matchLocale` for its tags, and `scripts/lib/langs.mjs`
(the `--lang` values of `snap` and `record`; a test keeps it equal to `LOCALES`).

## CI and release

- Day-to-day work is committed and pushed to `dev`; `main` only moves on a release.
- `.github/workflows/ci.yml` runs on pushes to `dev` and `main` and on pull requests to `main`. Job `check`:
  `npm ci`, `npm run check`, `npm run build`. Job `browser`: installs Playwright's Chromium
  (`npx playwright install --with-deps chromium`) and runs `npm run smoke:all` on
  SwiftShader (no GPU); `reports/` is uploaded as an artifact on failure.
- `.github/workflows/pages.yml` builds `dist/` and deploys it to GitHub Pages
  (configure-pages, upload-pages-artifact, deploy-pages). It runs when a tag matching `v*`
  is pushed, or manually through workflow dispatch. The vite `base` is `./`, so the bundle
  works from a sub-path.
- Both Pages jobs are gated by `github.repository == 'andrenepomuceno/particle.js'`, the
  repository the 2.0 code will move to; elsewhere the workflow does nothing. Pages must use
  "GitHub Actions" as its source in that repository.
- To release: on `dev`, bump `version` in `package.json` (shown in the Information dialog as
  `__APP_VERSION__`), add a `CHANGELOG.md` entry and commit. Then merge `dev` into `main`,
  tag `vX.Y.Z` on `main`, and push `main` and the tag.

## Analytics

Production builds load Google Analytics only when `VITE_GTAG_ID` is set at build time; the Pages
workflow takes it from the repository variable `GTAG_CONFIG` (as v1 did). The About dialog
tells visitors when it is active. Local and CI builds never include it.

## Tasks

One Markdown file per task in `tasks/inbox/`. When done, add a `## Result` section (or the
reason it was dropped) and move it to `tasks/done/`. The `tasks/` folder is a local work log and is
not versioned (it is in `.gitignore`).

## What v2 deliberately does differently from v1

| v1 | v2 |
| --- | --- |
| one `#define` per hard-coded potential, `forceMap[16]` uniform | user expressions compiled to GLSL, any number of forces |
| `simulation` exported as a reassigned live binding | one controller instance passed explicitly |
| `UI.root.render(<App/>)` every second, global mutable `UI` object | store + selector subscriptions |
| shader errors only in the console | validated before swap, shown in the UI, old shader keeps running |
| `alert()` and silent fallbacks on bad input | inline field errors and notices with the failing value |
| 1000+ line scenario files, commented-out code | small seeded scenarios, no dead code |
| webpack + Babel + MUI | Vite + TypeScript + plain CSS |
