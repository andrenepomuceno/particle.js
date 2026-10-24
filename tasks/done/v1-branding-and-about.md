# Branding, icons and About dialog (release blocker)

From the v1 inventory: v1 ships a favicon, android-chrome icons, web manifest and an About
dialog with welcome text and a GitHub link (v1 `ui/views/About.jsx`, `dist/index.html`, `img/`).
v2 has only the page title "particle.js v2". For 2.0: title "particle.js", favicon + icons
(reuse v1's from ../particle.js/img or dist), manifest, About dialog (what it is, how to start,
link, version, license), shown on first visit.

## Result

- Page title is "particle.js", with a meta description and the dark theme color (`#11151c`).
  Favicons (ico, 16, 32), apple-touch icon and the 192px android-chrome icon are copied from
  v1 `dist/img` into `public/`; `index.html` references them and `manifest.webmanifest`
  with relative paths (checked in `dist/index.html` after `npm run build`).
- New `src/ui/views/AboutView.tsx`, registered as one line in `DIALOGS` and so in the top menu.
  It opens on the first visit only (`about-seen` flag via `persist.ts`) and is excluded from
  the persisted open-dialogs list.
- The License row says "see the repository": v2 has no `LICENSE` file (v1 is GPL-3.0). Adding
  one is a decision for the owner.
- `scripts/smoke-interaction.mjs` now asserts About shows and closes it before gestures.
- Docs: README and `docs/interaction.md`.
