import { existsSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

/**
 * WebGL backend: the real GPU through WSL's D3D12 bridge when /dev/dxg exists (SwiftShader runs the
 * O(N²) shaders on the CPU and is orders of magnitude slower), otherwise SwiftShader (CI runners).
 * PARTICLE_GL=hardware|software forces one; PARTICLE_GPU_ADAPTER picks the D3D12 adapter by name.
 */
const GL_MODES = ['hardware', 'software'];
const glMode = process.env.PARTICLE_GL ?? (existsSync('/dev/dxg') ? 'hardware' : 'software');
if (!GL_MODES.includes(glMode)) throw new Error(`PARTICLE_GL must be one of ${GL_MODES.join(', ')}, got '${glMode}'`);
const LAUNCH = glMode === 'hardware'
  ? { args: ['--use-angle=gl', '--ignore-gpu-blocklist'], env: { ...process.env, MESA_D3D12_DEFAULT_ADAPTER_NAME: process.env.PARTICLE_GPU_ADAPTER ?? 'NVIDIA' } }
  : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };

/** Runs `body` against a Vite dev server and Chromium (see LAUNCH), closing both even on failure. */
export async function withBrowser(body) {
  const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
  await server.listen();
  const browser = await chromium.launch(LAUNCH);
  const probe = await browser.newPage();
  const renderer = await probe.evaluate(() => {
    const gl = globalThis.document.createElement('canvas').getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return gl ? gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) : 'no WebGL2';
  });
  await probe.close();
  console.error(`WebGL (${glMode}): ${renderer}`);
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
