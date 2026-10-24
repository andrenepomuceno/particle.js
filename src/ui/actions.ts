import type { SimulationController } from '../app/SimulationController';
import { COLOR_MODES } from '../engine/render/ParticlePoints';
import { SCENARIOS } from '../scenarios';

export interface ActionContext {
  controller: SimulationController;
  pointer: { x: number; y: number } | undefined;
  collapseAll: () => void;
  toggleOverlay: () => void;
  toggleDialog: (id: string) => void;
  openDialog: (id: string) => void;
  importFile: () => void;
}

export interface Action {
  id: string;
  label: string;
  /** KeyboardEvent.key, lower-cased; shown in menus as the shortcut. */
  key?: string;
  group: 'Simulation' | 'Camera' | 'View' | 'Particles';
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
  { id: 'pause', label: 'Pause / resume', key: ' ', group: 'Simulation', run: ({ controller }) => controller.togglePause() },
  { id: 'step', label: 'Step (when paused)', key: 'n', group: 'Simulation', run: ({ controller }) => controller.requestStep() },
  { id: 'reset', label: 'Reset scenario', key: 'r', group: 'Simulation', run: ({ controller }) => controller.reset() },
  { id: 'next', label: 'Next scenario', key: 'pagedown', group: 'Simulation', run: ({ controller }) => controller.cycleScenario(1) },
  { id: 'previous', label: 'Previous scenario', key: 'pageup', group: 'Simulation', run: ({ controller }) => controller.cycleScenario(-1) },
  { id: 'home', label: 'First scenario', key: 'home', group: 'Simulation', run: ({ controller }) => controller.loadScenario(SCENARIOS[0]!.id) },
  { id: 'sandbox', label: 'Sandbox', key: 's', group: 'Simulation', run: ({ controller }) => controller.loadScenario('sandbox') },
  { id: 'export', label: 'Export snapshot (JSON + PNG)', key: 'p', group: 'Simulation', run: exportSnapshot },
  { id: 'import', label: 'Import snapshot or scenario', key: 'i', group: 'Simulation', run: (ctx) => ctx.importFile() },
  {
    id: 'deleteAll', label: 'Delete all particles', key: 'delete', group: 'Simulation',
    run: ({ controller }) => window.confirm('Delete all particles?') && controller.deleteAll(),
  },
  { id: 'resetCamera', label: 'Reset camera', key: 'c', group: 'Camera', run: ({ controller }) => controller.resetCamera() },
  { id: 'frontCamera', label: 'Look down the z axis', key: 'v', group: 'Camera', run: ({ controller }) => controller.frontCamera() },
  { id: 'follow', label: 'Follow inspected particle', key: 'l', group: 'Camera', run: ({ controller }) => controller.toggleFollow() },
  { id: 'axes', label: 'Show / hide axes', key: 'a', group: 'View', run: ({ controller }) => controller.toggleAxes() },
  {
    id: 'colorMode', label: 'Cycle color mode', key: 'q', group: 'View',
    run: ({ controller }) => {
      const next = COLOR_MODES[(COLOR_MODES.indexOf(controller.state.colorMode) + 1) % COLOR_MODES.length]!;
      controller.setColorMode(next);
      controller.notify(`Color mode: ${next}`);
    },
  },
  { id: 'field', label: 'Show / hide force field', key: 'j', group: 'View', run: ({ controller }) => controller.toggleField() },
  { id: 'fitField', label: 'Re-fit field grid to the view', key: 'f', group: 'View', run: ({ controller }) => controller.fitField() },
  { id: 'record', label: 'Start / stop video recording', key: '*', group: 'View', run: ({ controller }) => controller.toggleRecording() },
  { id: 'hideOverlay', label: 'Hide everything', key: 'h', group: 'View', run: (ctx) => ctx.toggleOverlay() },
  { id: 'collapseAll', label: 'Close all dialogs', key: 'm', group: 'View', run: (ctx) => ctx.collapseAll() },
  { id: 'help', label: 'Keyboard help', key: '?', group: 'View', run: (ctx) => ctx.toggleDialog('help') },
  { id: 'generate', label: 'Generate particles at cursor', key: 'g', group: 'Particles', run: ({ controller, pointer }) => controller.generateAt(pointer?.x, pointer?.y) },
  { id: 'lookAtSelection', label: 'Look at selection', key: 'o', group: 'Particles', run: ({ controller }) => controller.lookAtSelection() },
  { id: 'copy', label: 'Copy selection', key: 'x', group: 'Particles', run: ({ controller }) => controller.copySelection() },
  { id: 'deleteSelection', label: 'Delete selection', key: 'd', group: 'Particles', run: ({ controller }) => controller.deleteSelection() },
  { id: 'zeroVelocity', label: 'Zero all velocities', key: 'b', group: 'Particles', run: ({ controller }) => controller.scaleVelocities(0) },
  { id: 'damp', label: 'Halve all velocities', key: 't', group: 'Particles', run: ({ controller }) => controller.scaleVelocities(0.5) },
  { id: 'kick', label: 'Random velocity kick', key: 'y', group: 'Particles', run: ({ controller }) => controller.scaleVelocities(1, 1) },
  {
    id: 'clear', label: 'Clear selection and inspection', key: 'escape', group: 'Particles',
    run: ({ controller }) => {
      controller.clearSelection();
      controller.inspect(undefined);
    },
  },
];

export const POINTER_GESTURES: readonly [string, string][] = [
  ['Click', 'Inspect particle'],
  ['Shift + drag', 'Box-select particles'],
  ['Hold Z + click', 'Place copied particles'],
  ['Drag / wheel', 'Orbit / zoom camera'],
  ['Right drag', 'Pan camera'],
];

export function keyLabel(key: string): string {
  return key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key[0]!.toUpperCase() + key.slice(1);
}
