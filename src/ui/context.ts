import { createContext, useContext, useSyncExternalStore } from 'react';
import type { AppState, SimulationController } from '../app/SimulationController';

export const ControllerContext = createContext<SimulationController | null>(null);

export function useController(): SimulationController {
  const controller = useContext(ControllerContext);
  if (!controller) throw new Error('useController must be used inside <ControllerContext.Provider>');
  return controller;
}

/** Subscribes to one slice of the simulation state; re-renders only when that slice changes. */
export function useAppState<T>(select: (state: AppState) => T): T {
  const { store } = useController();
  return useSyncExternalStore(store.subscribe, () => select(store.get()));
}
