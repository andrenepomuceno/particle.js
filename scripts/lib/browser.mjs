import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const CHROMIUM_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

/** Runs `body` against a Vite dev server and a SwiftShader Chromium, closing both even on failure. */
export async function withBrowser(body) {
  const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
  await server.listen();
  const browser = await chromium.launch({ args: CHROMIUM_ARGS });
  try {
    return await body({ browser, base: server.resolvedUrls.local[0] });
  } finally {
    await browser.close();
    await server.close();
  }
}

/** A page that behaves like a returning visitor, so the first-visit About dialog does not cover screenshots. */
export async function newAppPage(browser, options = {}) {
  const page = await browser.newPage(options);
  await page.addInitScript(() => localStorage.setItem('about-seen', 'true'));
  return page;
}

/** Collects deduplicated console errors/warnings and uncaught page errors. */
export function collectProblems(page) {
  const problems = [];
  const add = (text) => problems.includes(text) || problems.push(text);
  page.on('console', (message) => {
    if (!['error', 'warning'].includes(message.type())) return;
    // Scripts read particles back on purpose; this driver performance note is not an app defect.
    if (message.text().includes('GPU stall due to ReadPixels')) return;
    add(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => add(`pageerror: ${error.message}`));
  return problems;
}
