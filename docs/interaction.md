# Interaction

Same interaction model as v1. The authoritative list is `src/ui/actions.ts`, which also
feeds the in-app Shortcuts dialog (<kbd>?</kbd>). Shortcuts are ignored while typing in a
field; click the canvas to give focus back.

## Keyboard

| Key | Action |
| --- | --- |
| Space | pause / resume |
| N | one step (when paused) |
| R | reset scenario |
| PageDown / PageUp / Home | next / previous / first scenario |
| S | sandbox |
| P | export snapshot (JSON + PNG) |
| I | import snapshot |
| Delete | delete all particles (asks first) |
| C | reset camera |
| V | look down the z axis |
| F | follow the inspected particle |
| A | show / hide axes |
| Q | cycle color mode (charge, color, speed, mass, spin, parity) |
| H | hide all overlays |
| M | close all dialogs |
| G | generate particles at the cursor (Generator dialog sets the template) |
| X | copy selection to the clipboard |
| D | delete selection |
| B / T / Y | zero / halve / randomly kick all velocities |
| Escape | clear selection and inspection |
| ? | shortcuts dialog |

## Mouse

| Gesture | Effect |
| --- | --- |
| Click | inspect the particle under the cursor (opens the Particle dialog) |
| Shift + drag | box-select particles |
| Hold Z + click | place the clipboard centered at the cursor |
| Drag / wheel / right drag | orbit / zoom / pan (orbit is disabled in 2D) |

Placement and generation use the plane through the orbit target facing the camera
(z = 0 in 2D mode).

## Dialogs

Information, Forces, Parameters, Controls, Particle, Selection, Generator, Shortcuts.
Toggle them from the top menu; drag them by the title bar. Positions and which dialogs
are open persist in `localStorage` when the browser allows it.
