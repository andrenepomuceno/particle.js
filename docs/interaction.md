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
| J | show / hide the force field |
| F | re-fit the field grid to the current view |
| Q | cycle color mode (charge, color, speed, mass, spin direction (each axis −1…1 → 0…1), parity, nuclear, isospin) |
| * | start / stop recording the canvas to a WebM video (downloaded when it stops) |
| H | hide all overlays |
| M | close all dialogs |
| G | generate particles at the cursor (Generator dialog sets the template) |
| O | look at the selection (centers the camera on its centroid) |
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
| Shift + drag | box-select particles; a ruler shows the distance in world units (plus Δx, Δy in 2D) |
| Hold Z + click | place the clipboard centered at the cursor |
| Drag / wheel / right drag | orbit / zoom / pan (orbit is disabled in 2D) |

Placement and generation use the plane through the orbit target facing the camera
(z = 0 in 2D mode).

**Forces**: each force card collapses to a one-line summary (▸/▾, or *Collapse all*), flagged
when it has an error or warning. *Reference* opens **Expressions**, the full list of variables
(grouped by topic), functions, operators and range/softening rules.

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

Information, Forces, Expressions, Parameters, Controls, Particle, Selection, Generator, Field, Statistics, Shortcuts.

**Field** (<kbd>J</kbd>) draws a grid of arrows over the view showing the net force a test
particle would feel there, using the enabled forces exactly as the integrator does. The grid
lies in z = 0 in 2D mode and on the plane through the orbit target facing the camera in 3D;
cells are square, *Grid columns* across (2 to 256). Arrows point along the force (a component
toward the camera shortens them) and are colored like the speed palette: red to magenta up to
the 90th percentile of |F| over the probes, white beyond (the dialog shows that |F|). The test
particle's mass, 2D charge, spin vector, isospin, parity, nuclear charge and color are editable (default: mass 1,
charge 1, parity 1, the rest 0; its clock is 0). <kbd>F</kbd> re-fits the grid to the view;
with *Re-fit after camera moves* on (default) that happens after every orbit, pan, zoom,
camera reset or resize. The field is recomputed at most 10 times per second while time runs.
Probes are not particles: they never move, count, get selected or saved. *Logarithmic colors* maps |F| with log10(1 + 9·|F|/reference) instead of a square root, which keeps
fields spanning many decades (e.g. near Lennard-Jones cores) from saturating to white.

**Statistics** charts, once per second and up to 10 minutes back: energy (kinetic, potential,
total), mean and max speed, temperature (equipartition, k_B = 1) and performance (FPS, steps/s,
frame CPU time, sampling cost). Hover a chart for the values at that sample. Potential energy
comes from a GPU pass over all pairs that runs only while the dialog is open; forces written as
F(r) have no known V(r) and are listed as missing from it.
Toggle them from the top menu; drag them by the title bar. Positions and which dialogs
are open persist in `localStorage` when the browser allows it.
