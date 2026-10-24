// Drives the v1-style interactions in headless Chromium and prints PASS/FAIL per gesture.
// Usage: node scripts/smoke-interaction.mjs [screenshot.png]
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { collectProblems, withBrowser } from './lib/browser.mjs';

const out = process.argv[2] ?? 'reports/screenshots/interaction.png';
let failures = 0;
await withBrowser(async ({ browser, base }) => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = collectProblems(page);
  const state = () => page.evaluate(() => {
    const s = globalThis.particleController.state;
    return { count: s.particleCount, paused: s.paused, inspected: s.inspected?.index, selection: s.selection.length,
      clipboard: s.clipboard.length, forceErrors: s.forceErrors, shaderError: s.shaderError, axes: s.showAxes, color: s.colorMode };
  });
  const check = (name, ok, detail) => {
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' ' + JSON.stringify(detail) : ''}`);
  };

  await page.goto(`${base}?scenario=sandbox`);
  await page.waitForTimeout(800);
  check('About shows on first visit', await page.locator('[data-dialog="about"]').count() === 1);
  await page.locator('[data-dialog="about"] button').click();
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

  // Force cards start collapsed; an expanded one is remembered for the session.
  const startsCollapsed = await page.locator('[data-force="Gravity"] textarea').count() === 0;
  await page.getByRole('button', { name: 'Expand Gravity' }).click();
  const remembered = await page.evaluate(() => {
    const c = globalThis.particleController;
    const id = c.state.forces.find((f) => f.name === 'Gravity').id;
    return { stored: JSON.parse(globalThis.sessionStorage.getItem('forces-expanded')), id };
  });
  check('Force cards start collapsed and remember expansion', startsCollapsed && remembered.stored.includes(remembered.id), { startsCollapsed, remembered });
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
  // Achieved rates depend on the machine (CI runners vary 2x between windows), so the browser only
  // checks what is machine-independent; the limiter's timing is unit-tested in frameLimiter.test.ts.
  check('FPS limit caps at 30 and display rate keeps running', fps30 <= 31.5 && fps30 > 0 && fpsUnlimited > 0, { fps30, fpsUnlimited });

  // Playwright's filechooser event is unreliable under load, so check the two halves directly:
  // I opens the import input, and a file given to that input goes through the app's import path.
  await page.evaluate(() => {
    const input = globalThis.document.getElementById('import-file');
    // A real click listener on the real input; preventDefault only suppresses the OS picker.
    input.addEventListener('click', (event) => {
      globalThis.importClicked = true;
      event.preventDefault();
    }, { once: true });
  });
  await page.keyboard.press('i');
  const opened = await page.evaluate(() => globalThis.importClicked === true);
  await page.setInputFiles('#import-file', 'src/scenarios/library/40-crystal.json');
  await page.waitForTimeout(300);
  const imported = await page.evaluate(() => globalThis.particleController.state.name);
  await page.keyboard.press('r');
  await page.waitForTimeout(200);
  const afterReset = await page.evaluate(() => ({ name: globalThis.particleController.state.name, count: globalThis.particleController.state.particleCount }));
  check('I opens the import input; a scenario file imports and R resets it', opened && imported === 'Lennard-Jones crystal' && afterReset.name === imported && afterReset.count === 1200, afterReset);

  const fieldState = () => page.evaluate(() => {
    const s = globalThis.particleController.state;
    return { enabled: s.field.enabled, info: s.fieldInfo, count: s.particleCount, error: s.fieldError };
  });
  await page.mouse.move(700, 600);
  await page.keyboard.press('j');
  await page.waitForTimeout(500);
  let field = await fieldState();
  check('J shows the field, probes are not particles',
    field.enabled && field.info?.columns === 48 && field.info.rows > 0 && field.info.reference > 0 && Number.isFinite(field.info.reference)
    && field.count === afterReset.count && !field.error, field);
  const spacingBefore = field.info?.spacing;
  await page.evaluate(() => {
    const c = globalThis.particleController;
    c.setField({ autoRefresh: false });
    c.camera.position.sub(c.controls.target).multiplyScalar(2).add(c.controls.target);
    c.controls.update();
  });
  const unchanged = (await fieldState()).info?.spacing;
  await page.keyboard.press('f');
  await page.waitForTimeout(200);
  field = await fieldState();
  const ratio = field.info?.spacing / spacingBefore;
  check('F re-fits the grid to the view (auto-refresh off)', unchanged === spacingBefore && Math.abs(ratio - 2) < 1e-3, { spacingBefore, unchanged, ratio });
  await page.keyboard.press('j');
  field = await fieldState();
  check('J hides the field', !field.enabled && field.info === undefined, field);

  // Timeline: a scripted scenario fires its events as time passes and a reset rewinds them.
  const script = await page.evaluate(() => {
    const c = globalThis.particleController;
    c.importFile(JSON.stringify({
      format: 'particle.js-v2/scenario', version: 2, id: 'script', name: 'Script',
      forces: [{ name: 'Gravity', mode: 'potential', range: 'long', softening: 1, expression: '-G * m_i * m_j / r', params: [{ name: 'G', value: 2 }] }],
      groups: [{ count: 8, shape: { type: 'disk', radius: 10 } }],
      timeline: [
        { at: 0, caption: 'G = {Gravity.G}' },
        { at: 5, set: { 'Gravity.G': { multiply: 10 }, 'settings.friction': 0.5 }, caption: 'G = {Gravity.G}, friction {settings.friction}' },
      ],
    }), 'script.json');
    c.store.set({ paused: true });
    const before = { caption: c.state.caption, ...c.state.timeline };
    c.advance(6);
    const after = { caption: c.state.caption, ...c.state.timeline, G: c.state.forces[0].params[0].value, friction: c.state.settings.friction };
    // Restoring forces mid-script gives the scripted value (G×10 already fired), not the file's.
    c.updateForce(c.state.forces[0].id, { params: [{ name: 'G', value: 99 }] });
    c.restoreForces();
    after.restoredG = c.state.forces[0].params[0].value;
    c.reset();
    return { before, after, reset: { caption: c.state.caption, ...c.state.timeline, G: c.state.forces[0].params[0].value } };
  });
  // React commits the store update asynchronously; wait for the overlay instead of reading it once.
  const shown = await page.waitForFunction(() => globalThis.document.querySelector('.caption')?.textContent === 'G = 2', null, { timeout: 5000 })
    .then(() => 'G = 2', () => page.locator('.caption').textContent());
  check('Timeline fires events in time and resets rewind them',
    script.before.caption === 'G = 2' && script.before.fired === 1
    && script.after.caption === 'G = 20, friction 0.5' && script.after.fired === 2 && script.after.G === 20 && script.after.friction === 0.5 && script.after.restoredG === 20
    && script.reset.fired === 1 && script.reset.G === 2 && shown === 'G = 2', { ...script, shown });

  // Test particle: with the color scale locked, a stronger probe charge shows a stronger field.
  const locked = await page.evaluate(async () => {
    const c = globalThis.particleController;
    const wait = () => new Promise((resolve) => setTimeout(resolve, 400));
    c.importFile(JSON.stringify({
      format: 'particle.js-v2/scenario', version: 2, id: 'probe', name: 'Probe', forces: [{ preset: 'coulomb' }],
      groups: [{ count: 6, shape: { type: 'disk', radius: 50 }, charge: { cycle: [1, -1] } }],
    }), 'probe.json');
    c.store.set({ paused: true });
    c.setField({ enabled: true, lockScale: true, probe: { ...c.state.field.probe, charge: 1 } });
    await wait();
    const before = { reference: c.state.fieldInfo.reference, max: Math.max(...c.gpu.readFieldMagnitudes()) };
    c.setField({ probe: { ...c.state.field.probe, charge: 5 } });
    await wait();
    const after = { reference: c.state.fieldInfo.reference, max: Math.max(...c.gpu.readFieldMagnitudes()) };
    c.setField({ enabled: false, lockScale: false, probe: { ...c.state.field.probe, charge: 1 } });
    return { before, after };
  });
  check('Locked color scale keeps its reference while the test particle changes the field',
    locked.after.reference === locked.before.reference && Math.abs(locked.after.max / locked.before.max - 5) < 1e-3, locked);

  // Restore buttons: settings and forces return to what the world was loaded with.
  const restored = await page.evaluate(() => {
    const c = globalThis.particleController;
    const loaded = { friction: c.state.settings.friction, params: JSON.stringify(c.state.forces.map((f) => f.params)) };
    c.setSettings({ friction: 0.37 });
    c.updateForce(c.state.forces[0].id, { params: c.state.forces[0].params.map((p) => ({ ...p, value: p.value * 3 })) });
    c.restoreSettings();
    c.restoreForces();
    return { loaded, now: { friction: c.state.settings.friction, params: JSON.stringify(c.state.forces.map((f) => f.params)) } };
  });
  check('Restore puts the loaded settings and forces back', JSON.stringify(restored.loaded) === JSON.stringify(restored.now), restored);

  await page.keyboard.press('?');
  check('? opens shortcuts', await page.locator('[data-dialog="help"]').count() === 1);
  await mkdir(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out });
  check('No page errors', errors.length === 0, errors);
});
process.exit(failures === 0 ? 0 : 1);
