// Boots the dev server, opens scenarios in headless Chromium and saves screenshots.
// Usage: node scripts/snap.mjs [--scenario id,id|all] [--wait ms] [--capacity n] [--out dir] [--press key,key]
// --press sends the keys (e.g. j for the force field) after loading, before waiting.
import { mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { collectProblems, newAppPage, withBrowser } from './lib/browser.mjs';

/** Every bundled scenario id, in library (file-name) order. */
async function libraryIds() {
  const dir = new URL('../src/scenarios/library/', import.meta.url);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  return Promise.all(files.map(async (f) => JSON.parse(await readFile(new URL(f, dir), 'utf8')).id));
}

const { values } = parseArgs({
  options: {
    scenario: { type: 'string', default: 'galaxy' },
    wait: { type: 'string', default: '2000' },
    capacity: { type: 'string' },
    out: { type: 'string', default: 'reports/screenshots' },
    width: { type: 'string', default: '1400' },
    height: { type: 'string', default: '900' },
    press: { type: 'string', default: '' },
  },
});

const wait = Number(values.wait);
if (!Number.isFinite(wait) || wait < 0) throw new Error(`--wait must be a number of ms >= 0, got '${values.wait}'`);

let failures = 0;
await withBrowser(async ({ browser, base }) => {
  await mkdir(values.out, { recursive: true });
  const ids = values.scenario === 'all' ? await libraryIds() : values.scenario.split(',');
  for (const scenario of ids) {
    const page = await newAppPage(browser, { viewport: { width: Number(values.width), height: Number(values.height) } });
    const problems = collectProblems(page);
    const query = new URLSearchParams({ scenario, ...(values.capacity ? { capacity: values.capacity } : {}) });
    await page.goto(`${base}?${query}`);
    const keys = values.press.split(',').filter(Boolean);
    if (keys.length > 0) await page.waitForTimeout(500);
    for (const key of keys) await page.keyboard.press(key);
    await page.waitForTimeout(wait);
    const state = await page.evaluate(() => {
      const c = globalThis.particleController;
      if (!c) return undefined;
      const particles = c.readParticles();
      const finite = particles.every((p) => [...p.position, ...p.velocity].every(Number.isFinite));
      const { time, particleCount, fps, shaderError, forceErrors } = c.state;
      return { time, particleCount, fps: Math.round(fps), finite, shaderError, forceErrors };
    });
    const file = path.join(values.out, `${scenario}.png`);
    await page.screenshot({ path: file });
    const ok = state && state.finite && !state.shaderError && problems.length === 0;
    if (!ok) failures++;
    console.log(JSON.stringify({ scenario, ok, file, state, problems }, null, 2));
    await page.close();
  }
});
process.exit(failures === 0 ? 0 : 1);
