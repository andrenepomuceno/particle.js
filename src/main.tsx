import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startAnalytics } from './analytics';
import { SimulationController } from './app/SimulationController';
import { App } from './ui/App';
import { loadJson, saveJson } from './ui/persist';
import { PARTICLE_TARGET_KEY, SCENARIO_ORDER_KEY } from './ui/storageKeys';
import { SCENARIO_ORDERS, type ScenarioOrder } from './scenarios/order';
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
  // A stale or hand-edited preference must not lock the page out: it is cleared, and the user told.
  const savedOrder = loadJson<{ order?: unknown; byFolder?: unknown } | null>(SCENARIO_ORDER_KEY, null);
  let invalidOrder: string | undefined;
  if (savedOrder !== null) {
    if (SCENARIO_ORDERS.includes(savedOrder?.order as ScenarioOrder) && typeof savedOrder?.byFolder === 'boolean') {
      controller.setScenarioOrder(savedOrder.order as ScenarioOrder, savedOrder.byFolder);
    } else {
      saveJson(SCENARIO_ORDER_KEY, null);
      invalidOrder = `The saved scenario order ${JSON.stringify(savedOrder)} is not valid (order: one of ${SCENARIO_ORDERS.join(', ')}; byFolder: true or false) and was cleared`;
    }
  }
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
  if (invalidOrder) controller.notify(invalidOrder, 'error');
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
