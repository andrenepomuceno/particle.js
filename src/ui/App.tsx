import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SimulationController } from '../app/SimulationController';
import { ACTIONS, type ActionContext } from './actions';
import { Dialog } from './components/Dialog';
import { ControllerContext, useAppState } from './context';
import { usePointerGestures } from './input/usePointerGestures';
import { loadJson, saveJson } from './persist';
import { ForcesView } from './views/ForcesView';
import { ControlsView, GeneratorView, HelpView, InfoView, ParametersView, ParticleView, SelectionView } from './views/panels';

interface DialogSpec {
  id: string;
  title: string;
  position: { x: number; y: number };
  render: (ctx: ActionContext) => ReactNode;
}

const right = (offset: number) => ({ x: Math.max(window.innerWidth - offset, 8), y: 56 });

const DIALOGS: readonly DialogSpec[] = [
  { id: 'info', title: 'Information', position: { x: 8, y: 56 }, render: () => <InfoView /> },
  { id: 'forces', title: 'Forces', position: right(470), render: () => <ForcesView /> },
  { id: 'parameters', title: 'Parameters', position: { x: 8, y: 320 }, render: () => <ParametersView /> },
  { id: 'controls', title: 'Controls', position: { x: 290, y: 56 }, render: (ctx) => <ControlsView ctx={ctx} /> },
  { id: 'particle', title: 'Particle', position: { x: 8, y: 520 }, render: () => <ParticleView /> },
  { id: 'selection', title: 'Selection', position: { x: 290, y: 320 }, render: (ctx) => <SelectionView ctx={ctx} /> },
  { id: 'generator', title: 'Generator', position: { x: 290, y: 420 }, render: () => <GeneratorView /> },
  { id: 'help', title: 'Shortcuts', position: { x: 560, y: 56 }, render: () => <HelpView /> },
];

const OPEN_KEY = 'dialogs-open';

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

async function importSnapshotFile(controller: SimulationController, file: File | undefined): Promise<void> {
  if (!file) return;
  try {
    controller.importSnapshot(await file.text());
    controller.notify(`Imported ${file.name}`);
  } catch (error) {
    controller.notify(`Import of ${file.name} failed: ${(error as Error).message}`, 'error');
  }
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
  const viewport = useRef<HTMLDivElement>(null);
  const [pointer] = useState<{ current: { x: number; y: number } | undefined }>(() => ({ current: undefined }));
  const [open, setOpen] = useState<string[]>(() => loadJson(OPEN_KEY, ['info', 'forces']));
  const [overlayHidden, setOverlayHidden] = useState(false);

  useEffect(() => saveJson(OPEN_KEY, open), [open]);
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
    importFile: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = () => void importSnapshotFile(controller, input.files?.[0]);
      input.click();
    },
  }), [controller, pointer]);

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
      try {
        action.run(ctx);
      } catch (error) {
        controller.notify(`${action.label} failed: ${(error as Error).message}`, 'error');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controller, ctx]);

  const selectionBox = usePointerGestures(controller, viewport, pointer);


  return (
    <div className={overlayHidden ? 'hidden-overlay' : undefined}>
      <div className="viewport" ref={viewport} />
      {selectionBox && <div className="selection-box" style={selectionBox} />}
      <nav className="menu" aria-label="Dialogs">
        {DIALOGS.map((d) => (
          <button key={d.id} aria-pressed={open.includes(d.id)} onClick={() => ctx.toggleDialog(d.id)}>{d.title}</button>
        ))}
      </nav>
      {DIALOGS.filter((d) => open.includes(d.id)).map((d) => (
        <Dialog key={d.id} id={d.id} title={d.title} defaultPosition={d.position} onClose={() => ctx.toggleDialog(d.id)}>
          {d.render(ctx)}
        </Dialog>
      ))}
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
