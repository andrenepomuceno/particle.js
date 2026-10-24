// Runs a scenario headless and reports how particles cluster over time.
// Usage: node scripts/cluster-stats.mjs --scenario hadrons [--link 6,30] [--at 10,30,60] [--shots dir]
// For each link distance, particles closer than it are joined; the report lists cluster
// sizes and, for color-charged particles, the fraction of clusters that are color neutral.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const { values } = parseArgs({
  options: {
    scenario: { type: 'string', default: 'hadrons' },
    link: { type: 'string', default: '6,30' },
    at: { type: 'string', default: '10,30,60' },
    shots: { type: 'string' },
  },
});
const links = values.link.split(',').map(Number);
const times = values.at.split(',').map(Number);
for (const n of [...links, ...times]) if (!(n > 0)) throw new Error(`--link and --at take positive numbers, got ${n}`);

const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${server.resolvedUrls.local[0]}?scenario=${values.scenario}`);
await page.waitForFunction(() => globalThis.particleController?.state.particleCount >= 0);
await page.keyboard.press('m');
if (values.shots) await mkdir(values.shots, { recursive: true });

for (const target of times) {
  await page.waitForFunction((t) => globalThis.particleController.state.time >= t, target, { timeout: 600_000, polling: 250 });
  const report = await page.evaluate((linkDistances) => {
    const c = globalThis.particleController;
    const particles = c.readParticles();
    const n = particles.length;
    const finite = particles.every((p) => [...p.position, ...p.velocity].every(Number.isFinite));
    const summarize = (link) => {
      const parent = Array.from({ length: n }, (_, k) => k);
      const find = (k) => (parent[k] === k ? k : (parent[k] = find(parent[k])));
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = particles[i].position;
          const b = particles[j].position;
          if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < link) parent[find(i)] = find(j);
        }
      }
      const clusters = new Map();
      for (let k = 0; k < n; k++) {
        const root = find(k);
        if (!clusters.has(root)) clusters.set(root, []);
        clusters.get(root).push(particles[k]);
      }
      const sizes = {};
      let neutral = 0;
      let charged = 0;
      for (const members of clusters.values()) {
        sizes[members.length] = (sizes[members.length] ?? 0) + 1;
        const color = members.reduce((s, p) => s.map((v, k) => v + p.color[k]), [0, 0, 0]);
        if (members.some((p) => p.color.some((v) => v !== 0))) {
          charged++;
          const x = color[0] - (color[1] + color[2]) / 2;
          const y = (Math.sqrt(3) / 2) * (color[1] - color[2]);
          if (Math.hypot(x, y) < 1e-6) neutral++;
        }
      }
      return { link, clusters: clusters.size, sizes, colorNeutral: charged ? `${neutral}/${charged}` : 'n/a' };
    };
    return { time: Math.round(c.state.time), fps: Math.round(c.state.fps), finite, links: linkDistances.map(summarize) };
  }, links);
  console.log(JSON.stringify(report));
  if (values.shots) await page.screenshot({ path: path.join(values.shots, `${values.scenario}-t${target}.png`) });
}
if (errors.length) console.log(JSON.stringify({ errors }));
await browser.close();
await server.close();
process.exit(errors.length ? 1 : 0);
