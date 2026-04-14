# UI Bridge and Runtime Controls

This guide explains how particle.js connects the simulation-side GUI classes to the React dialog layer.
The project has two UI systems working together:

- a simulation-side control registration layer in `src/simulation/gui/`
- a React presentation layer in `src/ui/`

The bridge between them is intentionally lightweight.
The simulation remains the source of truth for runtime state, while the React layer renders dialogs and input components around that state.

Navigation: [Previous: Scenario Authoring and Physics Configuration](./scenario-authoring-and-physics-configuration.md) | [Docs Index](./README.md) | [Next: GPU Compute and Shader Pipeline](./gpu-compute-and-shader-pipeline.md) | [Project README](../README.md)

## UI Bridge Diagram

```mermaid
flowchart LR
	A[GUI class in src/simulation/gui] --> B[addUIOption()]
	B --> C[UI.addItem()]
	C --> D[UI view parameter bag]
	D --> E[React dialog view]
	E --> F[Input onFinish callback]
	F --> G[core.updatePhysics() or runtime action]
	H[animate() refresh cadence] --> I[GUI.refresh()]
	I --> D
```

## The Two-Layer UI Model

The easiest way to understand the UI is to separate ownership from presentation.

The simulation-side layer is responsible for:

- deciding which controls exist
- deciding which callback should run when a value changes
- reading current values from the live simulation state
- organizing controls into folders such as `forces`, `nuclear`, or `camera`

The React layer is responsible for:

- rendering dialogs and inputs
- storing whether a dialog is open or closed
- storing dialog size and screen position
- rendering view components such as Information, Parameters, Controls, Field, and Particle

That split is what allows simulation code to stay close to the domain model while still using React for the visible UI.

## `UI.start()` and the React Root

The bridge begins in `src/ui/App.jsx`.
The exported `UI` object contains a `start()` method that creates a React root and renders `<App />` into `#root`.

`viewSetup()` in `src/simulation/view.js` calls `UI.start()` before it constructs the GUI classes.
That order matters because the simulation-side GUI code will soon start registering items into the `UI` object, and the React layer needs to exist before the runtime begins interacting with it.

The `UI` object is not a React context or reducer store.
It is a plain exported object containing:

- `root`
- methods such as `start()`, `refresh()`, and `addItem()`
- one property bag per view such as `info`, `parameters`, `controls`, `field`, `particle`, `selection`, and `generator`

Each view bag stores:

- a `parameters` object
- a `setOpen` callback that React assigns when the dialog hook is mounted

This design is simple, but it means consumers need to respect the intended flow instead of treating `UI` as a general state manager.

## `useDialogView()` and Dialog State

`App.jsx` defines `useDialogView(viewName, defaultOpen)`.
That hook is how each React dialog view gets its open state and local parameter snapshot.

The hook performs several responsibilities:

- creates a `localStorage` key using the `DialogView:` prefix
- restores the last `open` value for the dialog if one was saved
- attaches the current dialog's `setOpen` function back onto the matching entry in the exported `UI` object
- stores dialog open and close state back into `localStorage`

This means dialog visibility is persistent between page reloads.
If a contributor adds a new top-level dialog, it should follow the same pattern so its open state behaves consistently with the rest of the UI.

## `CustomDialog` and Window Persistence

The dialog shell itself lives in `src/ui/components/CustomDialog.jsx`.
It stores size and position with a different key prefix:

- `CustomDialog:<id or title>`

The component restores and persists:

- `size`
- `position`

It also clamps the position to the viewport on load and on resize.
That matters because the project UI is closer to floating tool windows than to a fixed settings sidebar.
If a dialog is moved off-screen or the browser window changes size, `CustomDialog` is responsible for recovering a valid position.

The practical consequence is that UI persistence is split across two layers:

- open or closed state in `useDialogView()`
- size and position in `CustomDialog`

When documenting or debugging UI state, keep both mechanisms in mind.

## How Controls Reach React

The control-registration path starts in `src/simulation/gui/uiHelper.js`.
The core helper is `addUIOption()`.
It receives a configuration object with fields such as:

- `folder`
- `title`
- `variable`
- `options`
- `component`
- `refreshCallbacks`
- `onFinishChange`
- `selectionList`

`addUIOption()` creates a simple item object and passes it to `UI.addItem(component, item)`.
`UI.addItem()` then:

- assigns a unique id with `crypto.randomUUID()`
- infers an item type when one is not provided
- groups the item under `parameters[item.folder]`

This is why the React views can render folders without having to know which simulation class created each control.
By the time React reads the view bag, the controls are already grouped and typed.

## The Role of the GUI Classes

Each GUI class in `src/simulation/gui/` owns one slice of the control surface.
Examples include:

- `GUIParameters` for force and physics controls
- `GUIControls` for high-level simulation actions and camera/view controls
- `GUIField` for vector field controls
- `GUIParticle` for editing a selected particle
- `GUISelection` for selection-related actions

These classes all follow the same broad pattern:

1. build an `options` object inside the shared `guiOptions` structure from `view.js`
2. register controls with `addUIOption()`
3. keep a list of refresh callbacks that copy live simulation state back into those options

`GUIParameters` is the clearest example because most of its controls route to `core.updatePhysics(variable, value)`.
That keeps the UI thin while centralizing physics mutation policy in `core.js`.

## Refresh Flow in the Current Code

The current code in `src/ui/App.jsx` still uses full rerender refreshes through `UI.refresh()`.
That method simply calls `UI.root.render(<App />)` again.

This is an important implementation detail.
Some historical notes in the repository refer to finer-grained view invalidation, but the current file does not implement that path.
The documentation therefore follows the code that exists today.

The refresh cadence is driven from `animate()` in `src/simulation/view.js`.
Once per `viewUpdateDelay`, the view loop:

- optionally performs GPU readback for auto-refreshing info
- calls `refresh()` on the GUI classes
- calls `UI.refresh()`

This means the React tree is treated as a periodically refreshed mirror of simulation state.
It is not subscribed reactively to every physics change.
That choice keeps the runtime model straightforward, but it also means UI updates follow the animation loop cadence rather than instant React state propagation.

## Why Refresh Callbacks Exist

`addUIOption()` stores per-control refresh callbacks for non-function values.
Those callbacks update `item.value` from the underlying `options` object.
The GUI classes then call their refresh callback lists inside methods such as `GUIParameters.refresh()` and `GUIControls.refresh()`.

This serves two purposes:

- the input components receive current values even when simulation state changed elsewhere
- the UI can reflect derived values such as exponential formatting or squared-distance conversions

For example, `GUIParameters.refresh()` recalculates:

- `minDistance` from `Math.sqrt(simulation.physics.minDistance2)`
- `forceMap` from `simulation.physics.forceMap`
- any field that should display formatted scientific notation

Without refresh callbacks, the UI would keep stale snapshots of values that the runtime changed outside direct input interactions.

## Runtime Input Semantics

Control items can represent different kinds of interactions:

- button-like commands such as reset, next scenario, snapshot, or delete all
- booleans such as pause, show cursor, or enable boundary
- numeric or string inputs such as rotation speed, force constants, and particle radius
- selection inputs backed by enums such as friction model or nuclear potential

The item shape supports this by keeping a generic `value`, an optional `selectionList`, and an `onFinish` callback.
The React side does not need to understand the entire simulation domain.
It only needs to render an editor appropriate to the item's type and call `onFinish` when the user commits a change.

## Example: Adding a New Physics Control

A new physics control usually belongs in `GUIParameters`.
The normal workflow is:

1. add a field to `options.parameters`
2. register the control with `addPhysicsControl(...)`
3. provide a refresh callback that reads the current value from `simulation.physics`
4. route the runtime update through `core.updatePhysics()` or a specialized callback
5. confirm the corresponding React view already renders the folder where the item will appear

If the new field changes a shader-facing boolean, the callback should still go through `core.updatePhysics()` so the runtime can choose between uniform refresh and shader regeneration.
Do not teach the GUI layer to make that policy decision.

## Example: Adding a New High-Level Action

A new global action usually belongs in `GUIControls`.
The pattern there is different because many entries are imperative commands instead of value editors.
Examples include:

- `reset`
- `next`
- `previous`
- `snapshotJson`
- `record`

For actions of this kind:

- define a function on `options.controls`
- register it with `addMenuControl()`
- keep stateful side effects in the simulation layer, not in the React component

That keeps the React views generic and avoids scattering runtime logic across display components.

## Pointer, Keyboard, and Selection Integration

The UI bridge is not only about dialog controls.
`view.js` also wires runtime input helpers such as:

- `Mouse`
- `Keyboard`
- `Selection`
- `Ruler`

These helpers operate directly on the simulation and graphics layers.
When they need to surface information to the user, they update shared `guiOptions` state and ask the corresponding GUI object to refresh.
A good example is particle selection through raycasting, which sets `guiOptions.particle.obj`, refreshes the particle GUI, and then opens the particle dialog with `UI.particle.setOpen(true)`.

This is another reminder that the runtime interaction model remains simulation-first.
The React UI is informed after the simulation-side helper has already made the domain decision.

## Pitfalls When Extending the UI

The most common mistakes are:

- putting simulation truth into a React component instead of the runtime layer
- bypassing `core.updatePhysics()` for shader-sensitive physics changes
- forgetting to add a refresh callback for a control whose value changes externally
- assuming UI updates are fully reactive when the current code uses periodic rerendering
- documenting per-view invalidation behavior that is not implemented in the current `App.jsx`

## UI Extension Checklist

Before merging a UI change, verify the following:

1. the new control is registered from the correct GUI class
2. the control reads from live simulation state during refresh
3. the `onFinish` path mutates the correct runtime owner
4. dialog state persists correctly when the page reloads
5. the change still behaves after a scenario reset

If the new control affects physics flags or GPU-backed behavior, continue with [GPU Compute and Shader Pipeline](./gpu-compute-and-shader-pipeline.md).
If it introduces new setup semantics for a scenario, continue with [Scenario Authoring and Physics Configuration](./scenario-authoring-and-physics-configuration.md).

Navigation: [Previous: Scenario Authoring and Physics Configuration](./scenario-authoring-and-physics-configuration.md) | [Docs Index](./README.md) | [Next: GPU Compute and Shader Pipeline](./gpu-compute-and-shader-pipeline.md) | [Project README](../README.md)
