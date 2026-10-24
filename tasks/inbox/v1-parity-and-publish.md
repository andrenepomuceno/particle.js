# Bring over what is still missing from particle.js v1, then publish as 2.0

User request (2026-10-24): this project becomes particle.js 2.0. Port whatever v1 still has
that v2 lacks; at the end, move this code into the `particle.js` repository and publish.

- Inventory v1 features against v2 (read-only pass over ../particle.js: scenarios_v0/v1 folders,
  gui/*, components/*, field.js, record/capture, ruler, advanced menu, info panel fields,
  analytics/ENV flags, GitHub Pages workflow) and turn each gap into its own inbox task.
  Known gaps today: field visualization, recording, ruler, collisions.
- Decide which v1 scenarios are worth porting to JSON (the v1 nuclear/quark/forceMap families).
- Publishing plan, to be confirmed with the user before any step that leaves the machine:
  move v2 into the particle.js repo (history strategy: keep v1 history, v2 as a new major
  version), CI (check + smoke), GitHub Pages deploy, version 2.0.0, release notes.

## Frozen v1 next to v2 (user request, 2026-10-24)

When the code moves into the particle.js repo, keep v1 reachable: build v1 from a frozen tag (e.g.
`v1-final`, no further changes) into a `/v1/` sub-path of the same GitHub Pages site, and link it
from v2 (About tab and the menu: "particle.js v1 (classic)"). The Pages workflow builds both: v2 at
the root, v1 from the tag into `dist/v1/`. Check v1's asset paths work under the sub-path (Vite
`base`/webpack `publicPath`) and that its analytics/ids do not clash with v2's.
