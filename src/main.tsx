import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startAnalytics } from './analytics';
import { SimulationController } from './app/SimulationController';
import { App } from './ui/App';
import { loadJson, saveJson } from './ui/persist';
import { PARTICLE_TARGET_KEY } from './ui/storageKeys';
import './ui/styles.css';

function readCapacity(): number | undefined {
  const raw = new URLSearchParams(window.location.search).get('capacity');
  if (raw === null) return undefined;
  const capacity = Number(raw);
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new Error(`?capacity must be a positive integer, got '${raw}'`);
  }
  return capacity;
}

function readScenario(): string {
  return new URLSearchParams(window.location.search).get('scenario') ?? 'galaxy';
}

function fail(message: string): void {
  const root = document.getElementById('root')!;
  root.innerHTML = '';
  const box = document.createElement('pre');
  box.className = 'notice error';
  box.style.margin = '24px';
  box.textContent = message;
  root.appendChild(box);
  console.error(message);
}

function start(): void {
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) {
    fail('particle.js v2 needs WebGL2, which this browser or GPU does not provide.');
    return;
  }
  if (!probe.getExtension('EXT_color_buffer_float')) {
    fail('particle.js v2 needs the EXT_color_buffer_float WebGL2 extension to render to float textures.');
    return;
  }
  const controller = new SimulationController(readCapacity());
  const scenarioId = readScenario();
  const savedTarget = loadJson<number | null>(PARTICLE_TARGET_KEY, null);
  try {
    if (savedTarget !== null) controller.setParticleTarget(savedTarget);
    controller.loadScenario(scenarioId);
  } catch (error) {
    if (savedTarget === null) throw error;
    // A saved total that no longer works must not lock the page out on every reload.
    saveJson(PARTICLE_TARGET_KEY, null);
    controller.setParticleTarget(undefined);
    controller.loadScenario(scenarioId);
    controller.notify(`The saved particle count ${savedTarget} could not be used and was cleared: ${(error as Error).message}`, 'error');
  }
  Object.assign(window, { particleController: controller });
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App controller={controller} />
    </StrictMode>,
  );
}

try {
  startAnalytics();
  start();
} catch (error) {
  fail(`Startup failed: ${(error as Error).message}`);
}
