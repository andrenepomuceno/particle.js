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
