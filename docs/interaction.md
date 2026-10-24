# Interaction

Same interaction model as v1. The authoritative list is `src/ui/actions.ts`, which also
feeds the in-app Shortcuts dialog (<kbd>?</kbd>). Shortcuts are ignored while typing in a
field; click the canvas to give focus back.

## Keyboard

| Key | Action |
| --- | --- |
| Space | pause / resume |
| N | one step (when paused) |
| R | reset (rebuild the current scenario or re-import the snapshot) |
| PageDown / PageUp / Home | next / previous / first scenario |
| S | sandbox |
| P | export snapshot (JSON + PNG) |
| I | import a snapshot or a scenario file |
| Delete | delete all particles (asks first) |
| C | reset camera |
| V | look down the z axis |
| L | follow (lock the camera on) the inspected particle |
| A | show / hide axes |
| Q | cycle color mode (charge, color, speed, mass, spin, parity, nuclear) |
| H | hide all overlays |
| M | close all dialogs |
| G | generate particles at the cursor (Generator dialog sets the template) |
| X | copy selection to the clipboard |
| D | delete selection |
| B / T / Y | zero / halve / randomly kick all velocities |
| Escape | clear selection and inspection |
| ? | shortcuts dialog |

## About dialog

The About entry in the top menu describes the project, how to start, the version and the
repository link. It opens by itself on the first visit only (flag `about-seen` in
localStorage) and is never restored from the saved list of open dialogs.

## Mouse

| Gesture | Effect |
| --- | --- |
| Click | inspect the particle under the cursor (opens the Particle dialog) |
| Shift + drag | box-select particles |
| Hold Z + click | place the clipboard centered at the cursor |
| Drag / wheel / right drag | orbit / zoom / pan (orbit is disabled in 2D) |

Placement and generation use the plane through the orbit target facing the camera
(z = 0 in 2D mode).

## Look

Particles are drawn in v1's **spherow** style: a raymarched sphere with an arrow through it
along the velocity (no arrow when the particle is still). The sphere color follows the
color mode; in `charge` mode it is v1's meaningful color (positive blue, negative red,
neutral gray, tinted by color charge, green tint for negative nuclear charge or negative parity). The arrow uses v1's
speed palette: hue from red to magenta up to 16× the mean speed, white beyond. The mean
speed is sampled once per second. Controls → Particle style switches to flat discs, which
are cheaper. Controls → FPS limit caps rendering (and stepping) at 30, 60 (default) or the display rate
(no software cap, e.g. 144 fps on a 144 Hz screen). Browsers never present frames faster
than the display refreshes, so there is no higher setting.

## Particle count

Information → **Particles (next reset)** sets the total for generated scenarios, like v1's max
particles. It is applied on the next reset (R) or scenario load, remembered by the browser, and
scenarios rescale at constant density (see docs/scenarios.md). The GPU capacity grows on demand
(the default 16384 can also be raised with `?capacity=`); the cost per step is O(N²).

## Dialogs

Information, Forces, Parameters, Controls, Particle, Selection, Generator, Statistics, Shortcuts.

**Statistics** charts, once per second and up to 10 minutes back: energy (kinetic, potential,
total), mean and max speed, temperature (equipartition, k_B = 1) and performance (FPS, steps/s,
frame CPU time, sampling cost). Hover a chart for the values at that sample. Potential energy
comes from a GPU pass over all pairs that runs only while the dialog is open; forces written as
F(r) have no known V(r) and are listed as missing from it.
Toggle them from the top menu; drag them by the title bar. Positions and which dialogs
are open persist in `localStorage` when the browser allows it.
