# Development

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run check` | typecheck + lint + unit tests (`scripts/check.mjs`); run before every commit |
| `npm test` | unit tests only (Vitest, Node, no GPU) |
| `npm run snap -- --scenario a,b --wait ms` | headless Chromium screenshots to `reports/screenshots/`; fails on console/shader errors or non-finite state |
| `npm run smoke` | drives keyboard and mouse gestures headlessly, prints PASS/FAIL per gesture |
| `npm run parity` | runs the same steps on the GPU and on the float64 `referenceStep` inside the page; fails above a float32 tolerance |
| `npm run smoke:all` | `parity`, every scenario through `snap`, then `smoke` |
| `node scripts/cluster-stats.mjs --scenario id --link 5,30 --at 10,60` | runs a scenario headless and reports cluster sizes and color neutrality at each time; used to tune bound-state scenarios |
| `npm run build` | typecheck + production bundle in `dist/` |

The browser scripts use Playwright's Chromium with SwiftShader (software WebGL2), so
they run without a GPU; frame rates they report are not representative.

## Tasks

One Markdown file per task in `tasks/inbox/`. When done, add a `## Result` section (or the
reason it was dropped) and `git mv` it to `tasks/done/`.

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
