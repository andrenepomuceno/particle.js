// Drives the v1-style interactions in headless Chromium and prints PASS/FAIL per gesture.
// Usage: node scripts/smoke-interaction.mjs [screenshot.png]
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const out = process.argv[2] ?? 'reports/screenshots/interaction.png';
const server = await createServer({ root: process.cwd(), server: { port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const state = () => page.evaluate(() => {
  const s = globalThis.particleController.state;
  return { count: s.particleCount, paused: s.paused, inspected: s.inspected?.index, selection: s.selection.length,
    clipboard: s.clipboard.length, forceErrors: s.forceErrors, shaderError: s.shaderError, axes: s.showAxes, color: s.colorMode };
});
let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' ' + JSON.stringify(detail) : ''}`);
};

await page.goto(`${server.resolvedUrls.local[0]}?scenario=sandbox`);
await page.waitForTimeout(800);
await page.mouse.move(700, 600);
await page.keyboard.press('g');
await page.waitForTimeout(300);
let s = await state();
check('G generates at cursor', s.count === 100, s);

await page.keyboard.press(' ');
s = await state();
check('Space pauses', s.paused === true, s);

const target = await page.evaluate(() => {
  const c = globalThis.particleController;
  const p = c.readParticles()[0].position;
  const v = new (c.camera.position.constructor)(...p).project(c.camera);
  const r = c.renderer.domElement.getBoundingClientRect();
  return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
});
await page.mouse.click(target.x, target.y);
await page.waitForTimeout(200);
s = await state();
check('Click inspects particle', s.inspected !== undefined, s);
check('Particle dialog opened', await page.locator('[data-dialog="particle"]').count() === 1);

await page.keyboard.down('Shift');
await page.mouse.move(500, 380);
await page.mouse.down();
await page.mouse.move(900, 850, { steps: 5 });
await page.mouse.up();
await page.keyboard.up('Shift');
s = await state();
check('Shift+drag selects', s.selection > 0, s);

await page.keyboard.press('x');
s = await state();
check('X copies selection', s.clipboard > 0 && s.clipboard === s.selection, s);

await page.keyboard.down('z');
await page.mouse.click(620, 250);
await page.keyboard.up('z');
await page.waitForTimeout(200);
const afterPlace = (await state()).count;
check('Z+click places clipboard', s.clipboard > 0 && afterPlace === 100 + s.clipboard, { afterPlace });

const selected = (await state()).selection;
await page.keyboard.press('d');
s = await state();
check('D deletes selection', s.count === afterPlace - selected && s.selection === 0, s);

await page.keyboard.press('a');
await page.keyboard.press('q');
s = await state();
check('A toggles axes, Q cycles color', s.axes === false && s.color !== 'charge', s);

const expr = page.locator('[data-force="Gravity"] textarea');
await expr.fill('-G * m_i * m_j / r^2 + bogus');
await expr.press('Control+Enter');
await page.waitForTimeout(200);
s = await state();
const errText = await page.locator('[data-force="Gravity"] .errors').textContent().catch(() => '');
check('Invalid expression reported', Object.keys(s.forceErrors).length === 1 && errText.includes("unknown variable 'bogus'"), { errText });

await expr.fill('-G * m_i * m_j / r^2 * exp(-r / 500)');
await expr.press('Control+Enter');
await page.waitForTimeout(200);
s = await state();
check('Valid expression recompiles', Object.keys(s.forceErrors).length === 0 && !s.shaderError, s);
await page.mouse.click(700, 880);

await page.keyboard.press(' ');
await page.waitForTimeout(500);
const finite = await page.evaluate(() => globalThis.particleController.readParticles().every((p) => p.position.every(Number.isFinite)));
check('Runs finite after edits', finite);

const download = page.waitForEvent('download');
await page.mouse.move(700, 600);
await page.keyboard.press('p');
check('P exports snapshot', (await download).suggestedFilename().endsWith('.json'));

const enable = page.getByLabel('Enable Gravity');
await enable.click();
await enable.click();
const pausedBefore = (await state()).paused;
await page.keyboard.press(' ');
check('Space after clicking a checkbox pauses, checkbox untouched', (await state()).paused !== pausedBefore && await enable.isChecked());

const fpsAt = async (limit) => {
  await page.evaluate((l) => globalThis.particleController.setFpsLimit(l), limit);
  await page.waitForTimeout(2500);
  return page.evaluate(() => globalThis.particleController.state.fps);
};
const fps30 = await fpsAt(30);
const fpsUnlimited = await fpsAt(0);
await fpsAt(60);
check('FPS limit caps at 30 and display rate keeps running', fps30 > 20 && fps30 <= 31.5 && fpsUnlimited > 0, { fps30, fpsUnlimited });

const chooser = page.waitForEvent('filechooser');
await page.keyboard.press('i');
await (await chooser).setFiles('src/scenarios/library/40-crystal.json');
await page.waitForTimeout(300);
const imported = await page.evaluate(() => globalThis.particleController.state.name);
await page.keyboard.press('r');
await page.waitForTimeout(200);
const afterReset = await page.evaluate(() => ({ name: globalThis.particleController.state.name, count: globalThis.particleController.state.particleCount }));
check('I imports a scenario file and R resets it', imported === 'Lennard-Jones crystal' && afterReset.name === imported && afterReset.count === 1200, afterReset);

await page.keyboard.press('?');
check('? opens shortcuts', await page.locator('[data-dialog="help"]').count() === 1);
await mkdir(path.dirname(out), { recursive: true });
await page.screenshot({ path: out });
check('No page errors', errors.length === 0, errors);
await browser.close();
await server.close();
process.exit(failures === 0 ? 0 : 1);
