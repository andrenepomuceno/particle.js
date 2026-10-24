import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import type { SimulationController } from '../../app/SimulationController';

const CLICK_TOLERANCE_PX = 4;

interface Point { x: number; y: number }

/**
 * Canvas gestures carried over from v1: click inspects, shift+drag box-selects,
 * holding Z and clicking places the clipboard.
 */
export function usePointerGestures(
  controller: SimulationController,
  viewport: RefObject<HTMLDivElement | null>,
  pointer: { current: Point | undefined },
): { style: CSSProperties; label: string } | undefined {
  const [box, setBox] = useState<{ from: Point; to: Point }>();

  useEffect(() => {
    const element = viewport.current!;
    let down: Point | undefined;
    let dragBox: { from: Point; to: Point } | undefined;
    let zHeld = false;
    const updateBox = (next: typeof dragBox) => {
      dragBox = next;
      setBox(next);
    };

    const run = (label: string, action: () => void) => {
      try {
        action();
      } catch (error) {
        controller.notify(`${label} failed: ${(error as Error).message}`, 'error');
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'z') zHeld = event.type === 'keydown';
    };
    const onMove = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
      if (dragBox) updateBox({ ...dragBox, to: pointer.current });
    };
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const at = { x: event.clientX, y: event.clientY };
      if (event.shiftKey) {
        controller.controls.enabled = false;
        updateBox({ from: at, to: at });
      } else if (zHeld) {
        run('Place', () => controller.placeClipboard(at.x, at.y));
      } else {
        down = at;
      }
    };
    const onUp = (event: PointerEvent) => {
      const current = dragBox;
      if (current) {
        updateBox(undefined);
        controller.controls.enabled = true;
        run('Select', () => controller.selectInRect(current.from.x, current.from.y, event.clientX, event.clientY));
        return;
      }
      if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) <= CLICK_TOLERANCE_PX) {
        const at = down;
        run('Inspect', () => {
          const index = controller.pickAt(at.x, at.y);
          if (index !== undefined) controller.inspect(index);
        });
      }
      down = undefined;
    };

    element.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      element.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [controller, viewport, pointer]);

  if (!box) return undefined;
  // v1's ruler: the drag's extent in world units on the placement plane.
  const a = controller.worldAt(box.from.x, box.from.y);
  const b = controller.worldAt(box.to.x, box.to.y);
  const delta = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const label = `Δx ${delta[0]!.toPrecision(3)}  Δy ${delta[1]!.toPrecision(3)}  |Δ| ${Math.hypot(...delta).toPrecision(3)}`;
  return {
    style: {
      left: Math.min(box.from.x, box.to.x),
      top: Math.min(box.from.y, box.to.y),
      width: Math.abs(box.to.x - box.from.x),
      height: Math.abs(box.to.y - box.from.y),
    },
    label,
  };
}
