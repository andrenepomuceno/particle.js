import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startAnalytics } from './analytics';
import { SimulationController } from './app/SimulationController';
import { App } from './ui/App';
import { loadJson, saveJson } from './ui/persist';
import { LOCALE_KEY, PARTICLE_TARGET_KEY, SCENARIO_ORDER_KEY } from './ui/storageKeys';
import { isLocale, LOCALES, messagesFor, preferredLocale, type Locale } from './i18n';
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

/**
 * The interface language: ?lang= (en or pt-BR) for this visit, else the one chosen in the menu, else the
 * browser's preferred languages. A bad ?lang= fails startup; a bad saved choice is cleared.
 */
function readLocale(): { locale: Locale; invalidSaved: unknown } {
  const requested = new URLSearchParams(window.location.search).get('lang');
  if (requested !== null) {
    if (!isLocale(requested)) throw new Error(`?lang must be one of ${LOCALES.join(', ')}, got '${requested}'`);
    return { locale: requested, invalidSaved: undefined };
  }
  const saved = loadJson<unknown>(LOCALE_KEY, null);
  if (isLocale(saved)) return { locale: saved, invalidSaved: undefined };
  if (saved !== null) saveJson(LOCALE_KEY, null);
  return { locale: preferredLocale(navigator.languages), invalidSaved: saved ?? undefined };
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

function start(locale: Locale, invalidLocale: unknown): void {
  const t = messagesFor(locale);
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) {
    fail(t.startup.noWebGL2);
    return;
  }
  if (!probe.getExtension('EXT_color_buffer_float')) {
    fail(t.startup.noFloatTargets);
    return;
  }
  const controller = new SimulationController(readCapacity());
  controller.setLocale(locale);
  // A stale or hand-edited preference must not lock the page out: it is cleared, and the user told.
  const savedOrder = loadJson<{ order?: unknown; byFolder?: unknown } | null>(SCENARIO_ORDER_KEY, null);
  let invalidOrder: string | undefined;
  if (savedOrder !== null) {
    if (SCENARIO_ORDERS.includes(savedOrder?.order as ScenarioOrder) && typeof savedOrder?.byFolder === 'boolean') {
      controller.setScenarioOrder(savedOrder.order as ScenarioOrder, savedOrder.byFolder);
    } else {
      saveJson(SCENARIO_ORDER_KEY, null);
      invalidOrder = t.startup.invalidOrder(JSON.stringify(savedOrder), SCENARIO_ORDERS.join(', '));
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
    controller.notify(t.startup.invalidParticleTarget(savedTarget, (error as Error).message), 'error');
  }
  if (invalidOrder) controller.notify(invalidOrder, 'error');
  if (invalidLocale !== undefined) controller.notify(t.startup.invalidLocale(JSON.stringify(invalidLocale), LOCALES.join(', ')), 'error');
  Object.assign(window, { particleController: controller });
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App controller={controller} />
    </StrictMode>,
  );
}

let startupLocale: Locale = 'en';
try {
  startAnalytics();
  const { locale, invalidSaved } = readLocale();
  startupLocale = locale;
  document.documentElement.lang = locale;
  start(locale, invalidSaved);
} catch (error) {
  fail(messagesFor(startupLocale).startup.failed((error as Error).message));
}
