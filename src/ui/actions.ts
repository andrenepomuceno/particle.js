import type { SimulationController } from '../app/SimulationController';
import { COLOR_MODES } from '../engine/render/ParticlePoints';
import type { Messages } from '../i18n';

export interface ActionContext {
  controller: SimulationController;
  pointer: { x: number; y: number } | undefined;
  collapseAll: () => void;
  toggleOverlay: () => void;
  toggleDialog: (id: string) => void;
  openDialog: (id: string) => void;
  importFile: () => void;
}

/** An action's id names its label in the catalog (`Messages['actions']`). */
export type ActionId = keyof Messages['actions'];

export interface Action {
  id: ActionId;
  /** KeyboardEvent.key, lower-cased; shown in menus as the shortcut. */
  key?: string;
  group: keyof Messages['actionGroups'];
  run: (ctx: ActionContext) => void;
}

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportSnapshot({ controller }: ActionContext): void {
  const snapshot = controller.exportSnapshot();
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  const base = `${snapshot.name.replaceAll(/\W+/g, '_')}_${stamp}`;
  download(new Blob([JSON.stringify(snapshot)], { type: 'application/json' }), `${base}.json`);
  controller.screenshot().then((png) => download(png, `${base}.png`), (error: Error) => controller.notify(error.message, 'error'));
}

export const ACTIONS: readonly Action[] = [
  { id: 'pause', key: ' ', group: 'Simulation', run: ({ controller }) => controller.togglePause() },
  { id: 'step', key: 'n', group: 'Simulation', run: ({ controller }) => controller.requestStep() },
  { id: 'reset', key: 'r', group: 'Simulation', run: ({ controller }) => controller.reset() },
  { id: 'next', key: 'pagedown', group: 'Simulation', run: ({ controller }) => controller.cycleScenario(1) },
  { id: 'previous', key: 'pageup', group: 'Simulation', run: ({ controller }) => controller.cycleScenario(-1) },
  { id: 'home', key: 'home', group: 'Simulation', run: ({ controller }) => controller.loadFirstScenario() },
  { id: 'sandbox', key: 's', group: 'Simulation', run: ({ controller }) => controller.loadScenario('sandbox') },
  { id: 'export', key: 'p', group: 'Simulation', run: exportSnapshot },
  { id: 'import', key: 'i', group: 'Simulation', run: (ctx) => ctx.importFile() },
  {
    id: 'deleteAll', key: 'delete', group: 'Simulation',
    run: ({ controller }) => window.confirm(controller.messages.confirmDeleteAll) && controller.deleteAll(),
  },
  { id: 'resetCamera', key: 'c', group: 'Camera', run: ({ controller }) => controller.resetCamera() },
  { id: 'frontCamera', key: 'v', group: 'Camera', run: ({ controller }) => controller.frontCamera() },
  { id: 'follow', key: 'l', group: 'Camera', run: ({ controller }) => controller.toggleFollow() },
  { id: 'trail', key: 'k', group: 'View', run: ({ controller }) => controller.toggleTrail() },
  { id: 'axes', key: 'a', group: 'View', run: ({ controller }) => controller.toggleAxes() },
  { id: 'boundary', key: 'e', group: 'View', run: ({ controller }) => controller.toggleBoundary() },
  {
    id: 'colorMode', key: 'q', group: 'View',
    run: ({ controller }) => {
      const next = COLOR_MODES[(COLOR_MODES.indexOf(controller.state.colorMode) + 1) % COLOR_MODES.length]!;
      controller.setColorMode(next);
      controller.notify(controller.messages.colorModeNotice(controller.messages.options.colorMode[next]));
    },
  },
  { id: 'field', key: 'j', group: 'View', run: ({ controller }) => controller.toggleField() },
  { id: 'fitField', key: 'f', group: 'View', run: ({ controller }) => controller.fitField() },
  { id: 'record', key: '*', group: 'View', run: ({ controller }) => controller.toggleRecording() },
  { id: 'hideOverlay', key: 'h', group: 'View', run: (ctx) => ctx.toggleOverlay() },
  { id: 'collapseAll', key: 'm', group: 'View', run: (ctx) => ctx.collapseAll() },
  { id: 'help', key: '?', group: 'View', run: (ctx) => ctx.toggleDialog('help') },
  { id: 'generate', key: 'g', group: 'Particles', run: ({ controller, pointer }) => controller.generateAt(pointer?.x, pointer?.y) },
  { id: 'lookAtSelection', key: 'o', group: 'Particles', run: ({ controller }) => controller.lookAtSelection() },
  { id: 'copy', key: 'x', group: 'Particles', run: ({ controller }) => controller.copySelection() },
  { id: 'deleteSelection', key: 'd', group: 'Particles', run: ({ controller }) => controller.deleteSelection() },
  { id: 'zeroVelocity', key: 'b', group: 'Particles', run: ({ controller }) => controller.scaleVelocities(0) },
  { id: 'damp', key: 't', group: 'Particles', run: ({ controller }) => controller.scaleVelocities(0.5) },
  { id: 'kick', key: 'y', group: 'Particles', run: ({ controller }) => controller.scaleVelocities(1, 1) },
  {
    id: 'clear', key: 'escape', group: 'Particles',
    run: ({ controller }) => {
      controller.clearSelection();
      controller.inspect(undefined);
    },
  },
];

export function keyLabel(key: string, messages: Messages): string {
  return key === ' ' ? messages.spaceKey : key.length === 1 ? key.toUpperCase() : key[0]!.toUpperCase() + key.slice(1);
}
