// Boots the dev server, opens scenarios in headless Chromium and saves screenshots.
// Usage: node scripts/snap.mjs [--scenario id,id] [--wait ms] [--capacity n] [--out dir]
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { collectProblems, withBrowser } from './lib/browser.mjs';

const { values } = parseArgs({
  options: {
    scenario: { type: 'string', default: 'galaxy' },
    wait: { type: 'string', default: '2000' },
    capacity: { type: 'string' },
    out: { type: 'string', default: 'reports/screenshots' },
    width: { type: 'string', default: '1400' },
    height: { type: 'string', default: '900' },
  },
});

const wait = Number(values.wait);
if (!Number.isFinite(wait) || wait < 0) throw new Error(`--wait must be a number of ms >= 0, got '${values.wait}'`);

let failures = 0;
await withBrowser(async ({ browser, base }) => {
  await mkdir(values.out, { recursive: true });
  for (const scenario of values.scenario.split(',')) {
    const page = await browser.newPage({ viewport: { width: Number(values.width), height: Number(values.height) } });
    const problems = collectProblems(page);
    const query = new URLSearchParams({ scenario, ...(values.capacity ? { capacity: values.capacity } : {}) });
    await page.goto(`${base}?${query}`);
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
