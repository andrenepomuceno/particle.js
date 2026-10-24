import { chromium } from '@playwright/test';
import { createServer } from 'vite';

/**
 * WebGL backend. Default: the real GPU (ANGLE on the system OpenGL; on WSL2 that is Mesa over D3D12,
 * preferring the NVIDIA adapter), except on CI, which has no GPU and uses SwiftShader. SwiftShader runs
 * the O(N²) shaders on the CPU, orders of magnitude slower, so hardware mode fails if it gets a
 * software renderer instead. PARTICLE_GL=hardware|software forces a backend and
 * PARTICLE_GPU_ADAPTER=<name> picks another D3D12 adapter (e.g. Intel).
 */
const GL_MODES = ['hardware', 'software'];
const glMode = process.env.PARTICLE_GL ?? (process.env.CI ? 'software' : 'hardware');
if (!GL_MODES.includes(glMode)) throw new Error(`PARTICLE_GL must be one of ${GL_MODES.join(', ')}, got '${glMode}'`);
const LAUNCH = glMode === 'hardware'
  ? { args: ['--use-angle=gl', '--ignore-gpu-blocklist'], env: { ...process.env, MESA_D3D12_DEFAULT_ADAPTER_NAME: process.env.PARTICLE_GPU_ADAPTER ?? 'NVIDIA' } }
  : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|warp|basic render|no webgl2/i;

async function checkRenderer(browser) {
  const page = await browser.newPage();
  try {
    const renderer = await page.evaluate(() => {
      const gl = globalThis.document.createElement('canvas').getContext('webgl2');
      const info = gl?.getExtension('WEBGL_debug_renderer_info');
      return gl ? gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) : 'no WebGL2';
    });
    console.error(`WebGL (${glMode}): ${renderer}`);
    if (glMode === 'hardware' && SOFTWARE_RENDERER.test(renderer)) {
      throw new Error(`PARTICLE_GL=hardware got a software renderer (${renderer}); fix the GPU driver or run with PARTICLE_GL=software`);
    }
  } finally {
    await page.close();
  }
}

/** Runs `body` against a Vite dev server and Chromium (see LAUNCH), closing both even on failure. */
export async function withBrowser(body) {
  const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch(LAUNCH);
    await checkRenderer(browser);
    return await body({ browser, base: server.resolvedUrls.local[0], glMode });
  } finally {
    await browser?.close();
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
