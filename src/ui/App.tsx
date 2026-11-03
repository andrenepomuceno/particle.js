import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SimulationController } from '../app/SimulationController';
import { LOCALE_NAMES, LOCALES, type Locale, type Messages } from '../i18n';
import { ACTIONS, download, type ActionContext } from './actions';
import { Dialog } from './components/Dialog';
import { ControllerContext, useAppState, useMessages } from './context';
import { usePointerGestures } from './input/usePointerGestures';
import { loadJson, saveJson } from './persist';
import { LOCALE_KEY } from './storageKeys';
import { AboutView } from './views/AboutView';
import { ExpressionsView } from './views/ExpressionsView';
import { ForcesView } from './views/ForcesView';
import { StatsView } from './views/StatsView';
import { ControlsView, FieldView, GeneratorView, HelpView, InfoView, ParametersView, ParticleView, SelectionView, SpacetimeView } from './views/panels';

type DialogId = keyof Messages['dialogs'];

interface DialogSpec {
  id: DialogId;
  position: { x: number; y: number };
  render: (ctx: ActionContext) => ReactNode;
}

const right = (offset: number) => ({ x: Math.max(window.innerWidth - offset, 8), y: 56 });

const DIALOGS: readonly DialogSpec[] = [
  { id: 'info', position: { x: 8, y: 56 }, render: () => <InfoView /> },
  { id: 'forces', position: right(470), render: (ctx) => <ForcesView onReference={() => ctx.openDialog('expressions')} /> },
  { id: 'expressions', position: right(950), render: () => <ExpressionsView /> },
  { id: 'parameters', position: { x: 8, y: 320 }, render: () => <ParametersView /> },
  { id: 'spacetime', position: { x: 290, y: 520 }, render: () => <SpacetimeView /> },
  { id: 'controls', position: { x: 290, y: 56 }, render: (ctx) => <ControlsView ctx={ctx} /> },
  { id: 'particle', position: { x: 8, y: 520 }, render: () => <ParticleView /> },
  { id: 'selection', position: { x: 290, y: 320 }, render: (ctx) => <SelectionView ctx={ctx} /> },
  { id: 'generator', position: { x: 290, y: 420 }, render: () => <GeneratorView /> },
  { id: 'field', position: { x: 560, y: 320 }, render: () => <FieldView /> },
  { id: 'stats', position: right(900), render: () => <StatsView /> },
  { id: 'about', position: { x: Math.max((window.innerWidth - 460) / 2, 8), y: 120 }, render: () => <AboutView /> },
  { id: 'help', position: { x: 560, y: 56 }, render: () => <HelpView /> },
];

const OPEN_KEY = 'dialogs-open';
const IMPORT_INPUT_ID = 'import-file';
const ABOUT_SEEN_KEY = 'about-seen';

const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file']);

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(target.type);
  return target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
}

async function importFromFile(controller: SimulationController, file: File | undefined): Promise<void> {
  if (!file) return;
  try {
    controller.importFile(await file.text(), file.name);
    controller.notify(controller.messages.importFile.done(file.name));
  } catch (error) {
    controller.notify(controller.messages.importFile.failed(file.name, (error as Error).message), 'error');
  }
}

/** The interface language; the choice is remembered (a ?lang= link overrides it for that visit only). */
function LanguageSelect({ controller }: { controller: SimulationController }) {
  const t = useMessages();
  const locale = useAppState((s) => s.locale);
  const choose = (next: Locale) => {
    controller.setLocale(next);
    saveJson(LOCALE_KEY, next);
  };
  return (
    <select className="language" aria-label={t.languageLabel} title={t.languageLabel} value={locale} onChange={(e) => choose(e.target.value as Locale)}>
      {LOCALES.map((l) => <option key={l} value={l}>{LOCALE_NAMES[l]}</option>)}
    </select>
  );
}

function RecordingBadge() {
  const recording = useAppState((s) => s.recording);
  return recording ? <div className="recording mono" role="status">● REC</div> : null;
}

function Caption() {
  const caption = useAppState((s) => s.caption);
  return caption ? <div className="caption mono" role="status">{caption}</div> : null;
}

function Notices() {
  const notices = useAppState((s) => s.notices);
  return (
    <div className="notices" role="status">
      {notices.map((n) => <div key={n.id} className={`notice ${n.level}`}>{n.text}</div>)}
    </div>
  );
}

function Shell({ controller }: { controller: SimulationController }) {
  const t = useMessages();
  const locale = useAppState((s) => s.locale);
  const viewport = useRef<HTMLDivElement>(null);
  const [pointer] = useState<{ current: { x: number; y: number } | undefined }>(() => ({ current: undefined }));
  const [firstVisit] = useState(() => !loadJson(ABOUT_SEEN_KEY, false));
  const [open, setOpen] = useState<string[]>(() => {
    const ids = loadJson<string[]>(OPEN_KEY, ['info', 'forces']);
    return firstVisit ? [...ids, 'about'] : ids;
  });
  const [overlayHidden, setOverlayHidden] = useState(false);

  // About is not restored on later visits; the seen flag alone decides when it appears.
  useEffect(() => saveJson(OPEN_KEY, open.filter((id) => id !== 'about')), [open]);
  useEffect(() => saveJson(ABOUT_SEEN_KEY, true), []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    let wasInspecting = controller.state.inspected !== undefined;
    return controller.store.subscribe(() => {
      const inspecting = controller.state.inspected !== undefined;
      if (inspecting && !wasInspecting) setOpen((ids) => (ids.includes('particle') ? ids : [...ids, 'particle']));
      wasInspecting = inspecting;
    });
  }, [controller]);

  const ctx = useMemo<ActionContext>(() => ({
    controller,
    get pointer() {
      return pointer.current;
    },
    collapseAll: () => setOpen([]),
    toggleOverlay: () => setOverlayHidden((hidden) => !hidden),
    toggleDialog: (id) => setOpen((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])),
    openDialog: (id) => setOpen((ids) => (ids.includes(id) ? ids : [...ids, id])),
    importFile: () => {
      const input = document.getElementById(IMPORT_INPUT_ID);
      if (!(input instanceof HTMLInputElement)) throw new Error(`#${IMPORT_INPUT_ID} is missing from the page`);
      input.click();
    },
  }), [controller, pointer]);

  useEffect(() => {
    // Kept after unmount on purpose: a recording stopped by the unmount still finishes and downloads.
    controller.setRecordingSink((video) => download(video, `particle-js-${new Date().toISOString().replaceAll(/[:.]/g, '-')}.webm`));
  }, [controller]);

  useEffect(() => {
    const container = viewport.current!;
    const unmount = controller.mount(container);
    const observer = new ResizeObserver(() => controller.resize(container.clientWidth, container.clientHeight));
    observer.observe(container);
    return () => {
      observer.disconnect();
      unmount();
    };
  }, [controller]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      const action = ACTIONS.find((a) => a.key === event.key.toLowerCase());
      if (!action) return;
      event.preventDefault();
      // A focused checkbox or button would also react to Space/Enter; shortcuts win.
      if (event.target instanceof HTMLElement && event.target !== document.body) event.target.blur();
      try {
        action.run(ctx);
      } catch (error) {
        controller.notify(controller.messages.failed(controller.messages.actions[action.id], (error as Error).message), 'error');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controller, ctx]);

  const selectionBox = usePointerGestures(controller, viewport, pointer);


  return (
    <div className={overlayHidden ? 'hidden-overlay' : undefined}>
      <div className="viewport" ref={viewport} />
      {selectionBox && <div className="selection-box" style={selectionBox.style}><span className="ruler mono">{selectionBox.label}</span></div>}
      <RecordingBadge />
      <Caption />
      <nav className="menu" aria-label={t.menuLabel}>
        {DIALOGS.map((d) => (
          <button key={d.id} aria-pressed={open.includes(d.id)} onClick={() => ctx.toggleDialog(d.id)}>{t.dialogs[d.id]}</button>
        ))}
        <LanguageSelect controller={controller} />
      </nav>
      {DIALOGS.filter((d) => open.includes(d.id)).map((d) => (
        <Dialog key={d.id} id={d.id} title={t.dialogs[d.id]} defaultPosition={d.position} onClose={() => ctx.toggleDialog(d.id)}>
          {d.render(ctx)}
        </Dialog>
      ))}
      <input id={IMPORT_INPUT_ID} type="file" accept=".json,application/json" hidden
        onChange={(event) => {
          const input = event.currentTarget;
          void importFromFile(controller, input.files?.[0]).finally(() => (input.value = ''));
        }} />
      <Notices />
    </div>
  );
}

export function App({ controller }: { controller: SimulationController }) {
  return (
    <ControllerContext.Provider value={controller}>
      <Shell controller={controller} />
    </ControllerContext.Provider>
  );
}
