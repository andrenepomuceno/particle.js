import { Fragment, useState } from 'react';
import { COLOR_MODES, PARTICLE_STYLES } from '../../engine/render/ParticlePoints';
import { DEFAULT_PROBE, validateColumns } from '../../engine/field';
import { ProbeFields } from '../components/ProbeFields';
import { HISTORY_DEPTH_RANGE, INTEGRATORS, METRICS, type BoundaryShape, type Metric, type SimulationSettings } from '../../engine/settings';
import { DEFAULT_GENERATOR, FPS_LIMITS, MAX_CAPACITY } from '../../app/SimulationController';
import { loadJson, saveJson } from '../persist';
import { PARTICLE_TARGET_KEY, SCENARIO_FOLDERS_KEY, SCENARIO_ORDER_KEY } from '../storageKeys';
import { SPECIES, SPECIES_IDS, type SpeciesId } from '../../engine/species';
import { SCENARIOS } from '../../scenarios';
import { orderScenarios, SCENARIO_ORDERS, scenarioFolders, type ScenarioOrder } from '../../scenarios/order';
import type { ScenarioSource } from '../../scenarios/source';
import type { Scenario } from '../../scenarios/types';
import { ACTIONS, download, keyLabel, POINTER_GESTURES, type Action, type ActionContext } from '../actions';
import { CheckField, NumberField, SelectField, Vec3Field, nonNegative, positive, unitInterval } from '../components/fields';
import { useAppState, useController } from '../context';
import { Tabs } from '../components/Tabs';

const FOLLOW_KEY = ACTIONS.find((a) => a.id === 'follow')!.key!;
const TRAIL_KEY = ACTIONS.find((a) => a.id === 'trail')!.key!;
const FIT_FIELD_KEY = ACTIONS.find((a) => a.id === 'fitField')!.key!;

/** Applying a species fills the generator template; the user can still edit each field afterwards. */
const speciesTemplate = (id: SpeciesId) => {
  const { mass, charge, isospin, nuclearCharge } = SPECIES[id];
  return { species: id, mass, charge, charge2: 0, isospin, nuclearCharge, chargeSpread: 'fixed' as const };
};

/** Fields a species preset fills; editing one of them by hand leaves the preset. */
const SPECIES_FIELDS = ['mass', 'charge', 'charge2', 'isospin', 'nuclearCharge'] as const;

const fpsLimitLabel = (limit: number) => (limit === 0 ? 'display rate' : String(limit));

const format = (value: number, digits = 3) => (Number.isInteger(value) ? String(value) : value.toPrecision(digits));

const INFO_TABS = ['Overview', 'Scenarios', 'JSON'] as const;
type InfoTab = (typeof INFO_TABS)[number];

/** The JSON tab's text, tied to the world source it started from; `error` is the last failed apply. */
interface JsonDraft {
  source: ScenarioSource | undefined;
  text: string;
  error: string | undefined;
}

const freshDraft = (source: ScenarioSource | undefined): JsonDraft => ({ source, text: source?.text ?? '', error: undefined });

export function InfoView() {
  const [tab, setTab] = useState<InfoTab>('Overview');
  const source = useAppState((s) => s.scenarioSource);
  // Held above the tabs so switching tabs keeps unapplied edits; only a new world source
  // (another scenario or file loaded, or an applied edit) replaces it. R keeps the same source.
  const [draft, setDraft] = useState(() => freshDraft(source));
  if (draft.source !== source) setDraft(freshDraft(source));
  return (
    <div className="stack">
      <Tabs tabs={INFO_TABS} value={tab} onChange={setTab} />
      {tab === 'Overview' && <OverviewTab />}
      {tab === 'Scenarios' && <ScenariosTab />}
      {tab === 'JSON' && <JsonTab draft={draft} onChange={setDraft} />}
    </div>
  );
}

const scenarioLabel = (s: Scenario, order: ScenarioOrder) => (order === 'name' ? `${s.name} (${s.folder})` : `${s.folder} / ${s.name}`);

function OverviewTab() {
  const controller = useController();
  const name = useAppState((s) => s.name);
  const scenarioId = useAppState((s) => s.scenarioId);
  const count = useAppState((s) => s.particleCount);
  const capacity = useAppState((s) => s.capacity);
  const time = useAppState((s) => Math.round(s.time * 100) / 100);
  const fps = useAppState((s) => Math.round(s.fps));
  const timeline = useAppState((s) => s.timeline);
  const averageSpeed = useAppState((s) => s.averageSpeed);
  const paused = useAppState((s) => s.paused);
  const forces = useAppState((s) => s.forces.filter((f) => f.enabled).length);
  const description = useAppState((s) => s.description);
  const edited = useAppState((s) => s.scenarioSource !== undefined && s.scenarioSource.text !== s.scenarioSource.original);
  const target = useAppState((s) => s.particleTarget);
  const defaultCount = SCENARIOS.find((s) => s.id === scenarioId)?.defaultCount;
  const seed = useAppState((s) => s.seed);
  const order = useAppState((s) => s.scenarioOrder);
  // Re-renders with the grouping too, since the listed order depends on it.
  useAppState((s) => s.scenariosByFolder);
  const applyTarget = (value: number | undefined) => {
    controller.setParticleTarget(value);
    saveJson(PARTICLE_TARGET_KEY, value ?? null);
  };
  const attempt = (label: string, action: () => void) => {
    try {
      action();
    } catch (error) {
      controller.notify(`${label} failed: ${(error as Error).message}`, 'error');
    }
  };

  return (
    <div className="stack">
      <select aria-label="Scenario" value={scenarioId} onChange={(e) => attempt('Loading the scenario', () => controller.loadScenario(e.target.value))}>
        {scenarioId === '' && <option value="">{name} ({edited ? 'edited' : 'imported'})</option>}
        {controller.listedScenarios().map((s) => <option key={s.id} value={s.id}>{scenarioLabel(s, order)}</option>)}
      </select>
      {description && <p className="muted" style={{ margin: 0 }}>{description}</p>}
      {defaultCount === 0 && target === undefined ? (
        <p className="muted" style={{ margin: 0 }}>This scenario starts empty; a particle count applies to generated scenarios.</p>
      ) : (
      <div className="grid">
        <NumberField label="Particles (next reset)" value={target ?? defaultCount ?? count}
          validate={(v) => (Number.isInteger(v) && v >= 1 && v <= MAX_CAPACITY ? undefined : `must be an integer within [1, ${MAX_CAPACITY}]`)}
          onCommit={(v) => applyTarget(v)} />
      </div>
      )}
      <div className="row">
        <button className="outlined" onClick={() => attempt('Reset', () => controller.reset())}>Apply (reset) <kbd>R</kbd></button>
        {target !== undefined && <button className="outlined" onClick={() => applyTarget(undefined)}>Use scenario default{defaultCount !== undefined ? ` (${defaultCount})` : ''}</button>}
      </div>
      <dl className="stats">
        <dt>Status</dt><dd>{paused ? 'paused' : 'running'}</dd>
        <dt>Particles</dt><dd>{count} / {capacity}</dd>
        <dt>Active forces</dt><dd>{forces}</dd>
        <dt>Time</dt><dd>{time}</dd>
        <dt>Mean speed</dt><dd>{format(averageSpeed)}</dd>
        <dt>FPS</dt><dd>{fps}</dd>
        {seed && <><dt>Seed</dt><dd title={seed.fixed ? 'fixed by the scenario file' : 'drawn for this start; add "seed" to the JSON to repeat it'}>{seed.value} ({seed.fixed ? 'fixed' : 'random'})</dd></>}
        {timeline.total > 0 && (
          <><dt>Script</dt><dd>{timeline.fired} / {timeline.total} events{timeline.nextAt !== undefined ? ` · next at t = ${timeline.nextAt}` : ''}</dd></>
        )}
      </dl>
      <p className="muted" style={{ margin: 0 }}>v{__APP_VERSION__} · press <kbd>?</kbd> for shortcuts</p>
    </div>
  );
}

/** The library as a list: collapsible folders (remembered) or flat, in the chosen order. */
function ScenariosTab() {
  const controller = useController();
  const scenarioId = useAppState((s) => s.scenarioId);
  const order = useAppState((s) => s.scenarioOrder);
  const byFolder = useAppState((s) => s.scenariosByFolder);
  const [expanded, setExpanded] = useState<string[]>(() => {
    const stored = loadJson<unknown>(SCENARIO_FOLDERS_KEY, null);
    if (Array.isArray(stored) && stored.every((f) => typeof f === 'string')) return stored;
    const current = SCENARIOS.find((s) => s.id === scenarioId);
    return current ? [current.folder] : [];
  });
  const folders = scenarioFolders(SCENARIOS, order);
  const setOrder = (nextOrder: ScenarioOrder, nextByFolder: boolean) => {
    controller.setScenarioOrder(nextOrder, nextByFolder);
    saveJson(SCENARIO_ORDER_KEY, { order: nextOrder, byFolder: nextByFolder });
  };
  const expand = (next: string[]) => {
    setExpanded(next);
    saveJson(SCENARIO_FOLDERS_KEY, next);
  };
  const load = (id: string) => {
    try {
      controller.loadScenario(id);
    } catch (error) {
      controller.notify(`Loading the scenario failed: ${(error as Error).message}`, 'error');
    }
  };
  const item = (s: Scenario, showFolder: boolean) => (
    <li key={s.id}>
      <button className={s.id === scenarioId ? 'scenario-item active' : 'scenario-item'} aria-current={s.id === scenarioId} title={s.description} onClick={() => load(s.id)}>
        <span>{s.name}</span>
        <span className="muted">{[showFolder && s.folder, order === 'newest' && s.added?.slice(0, 10)].filter(Boolean).join(' · ')}</span>
      </button>
    </li>
  );
  return (
    <div className="stack">
      <div className="grid">
        <SelectField<ScenarioOrder> label="Order" value={order} options={SCENARIO_ORDERS} onChange={(next) => setOrder(next, byFolder)} />
        <CheckField label="Group by folder" checked={byFolder} onChange={(next) => setOrder(order, next)} />
      </div>
      {byFolder && (
        <div className="row">
          <button className="outlined" onClick={() => expand(folders.map((f) => f.folder))}>Expand all</button>
          <button className="outlined" onClick={() => expand([])}>Collapse all</button>
        </div>
      )}
      <div className="scenario-browser">
      {byFolder ? (
        <>
          {folders.map(({ folder, scenarios }) => {
            const open = expanded.includes(folder);
            return (
              <section key={folder}>
                <button className="folder-toggle" aria-expanded={open} onClick={() => expand(open ? expanded.filter((f) => f !== folder) : [...expanded, folder])}>
                  {open ? '▾' : '▸'} {folder} <span className="muted">{scenarios.length}</span>
                </button>
                {open && <ul className="scenario-list">{scenarios.map((s) => item(s, false))}</ul>}
              </section>
            );
          })}
        </>
      ) : (
        <ul className="scenario-list">{orderScenarios(SCENARIOS, order).map((s) => item(s, true))}</ul>
      )}
      </div>
    </div>
  );
}

/**
 * The current scenario file as text. Apply starts it like an imported file (R restarts the edit);
 * Revert brings back the text as loaded from the library or the file.
 */
function JsonTab({ draft, onChange }: { draft: JsonDraft; onChange: (draft: JsonDraft) => void }) {
  const controller = useController();
  const target = useAppState((s) => s.particleTarget);
  const { source, text, error } = draft;
  if (!source) {
    return <p className="muted" style={{ margin: 0 }}>The current world came from a snapshot, not a scenario file, so there is no JSON to edit. Load a scenario or import a scenario file.</p>;
  }
  const apply = () => {
    try {
      controller.applyScenarioEdit(text);
      controller.notify(`Applied the edited ${source.file}`);
    } catch (failure) {
      onChange({ ...draft, error: (failure as Error).message });
    }
  };
  const status = text !== source.text ? 'unapplied changes' : source.text !== source.original ? 'edit applied' : 'as loaded';
  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>{source.file} · {status}</p>
      <textarea className={error ? 'json-editor invalid' : 'json-editor'} aria-label="Scenario JSON" spellCheck={false} value={text}
        onChange={(event) => onChange({ ...draft, text: event.target.value })} />
      {error && <pre className="errors">{error}</pre>}
      {target !== undefined && (
        <p className="muted" style={{ margin: 0 }}>Particles (next reset) is {target}: the groups' counts are rescaled to that total.</p>
      )}
      <div className="row">
        <button className="primary" onClick={apply}>Apply (reset)</button>
        <button className="outlined" disabled={text === source.original} onClick={() => onChange({ ...draft, text: source.original, error: undefined })}>Revert</button>
        <button className="outlined" onClick={() => download(new Blob([text], { type: 'application/json' }), `${source.id}.json`)}>Download</button>
      </div>
    </div>
  );
}

function ActionButtons({ group, ctx }: { group: Action['group']; ctx: ActionContext }) {
  return (
    <div className="stack">
      {ACTIONS.filter((a) => a.group === group).map((action) => (
        <button key={action.id} className="outlined" style={{ textAlign: 'left' }} onClick={() => action.run(ctx)}>
          {action.label} {action.key && <kbd style={{ float: 'right' }}>{keyLabel(action.key)}</kbd>}
        </button>
      ))}
    </div>
  );
}

export function ControlsView({ ctx }: { ctx: ActionContext }) {
  const controller = useController();
  const colorMode = useAppState((s) => s.colorMode);
  const radius = useAppState((s) => s.particleRadius);
  const style = useAppState((s) => s.particleStyle);
  const fpsLimit = useAppState((s) => s.fpsLimit);
  return (
    <div>
      {(['Simulation', 'Camera', 'View'] as const).map((group) => (
        <Fragment key={group}>
          <h3 className="section-title">{group}</h3>
          <ActionButtons group={group} ctx={ctx} />
        </Fragment>
      ))}
      <div className="grid" style={{ marginTop: 8 }}>
        <SelectField label="FPS limit" value={fpsLimitLabel(fpsLimit)} options={FPS_LIMITS.map(fpsLimitLabel)}
          onChange={(label) => controller.setFpsLimit(FPS_LIMITS.find((l) => fpsLimitLabel(l) === label)!)} />
        <SelectField label="Particle style" value={style} options={PARTICLE_STYLES} onChange={(s) => controller.setParticleStyle(s)} />
        <SelectField label="Color by" value={colorMode} options={COLOR_MODES} onChange={(m) => controller.setColorMode(m)} />
        <NumberField label="Particle radius" value={radius} validate={positive} onCommit={(r) => controller.setParticleRadius(r)} />
      </div>
    </div>
  );
}

export function ParametersView() {
  const controller = useController();
  const settings = useAppState((s) => s.settings);
  const showBoundary = useAppState((s) => s.showBoundary);
  const set = (patch: Parameters<typeof controller.setSettings>[0]) => controller.setSettings(patch);
  return (
    <div className="grid">
      <SelectField label="Integrator" value={settings.integrator} options={INTEGRATORS} onChange={(integrator) => set({ integrator })} />
      <NumberField label="Time step" value={settings.timeStep} validate={positive} onCommit={(timeStep) => set({ timeStep })} />
      <NumberField label="Friction" value={settings.friction} validate={nonNegative} onCommit={(friction) => set({ friction })} />
      <NumberField label="Quadratic drag (v1)" value={settings.quadraticDrag} validate={nonNegative} onCommit={(quadraticDrag) => set({ quadraticDrag })} />
      <NumberField label="Max speed (0 = off)" value={settings.maxSpeed} validate={nonNegative} onCommit={(maxSpeed) => set({ maxSpeed })} />
      {/* A slab depth only exists for boxes: leaving the box clears it, and the field disappears with it. */}
      <SelectField<BoundaryShape> label="Boundary" value={settings.boundary} options={['none', 'sphere', 'box']}
        onChange={(boundary) => set(boundary === 'box' ? { boundary } : { boundary, boundaryDepth: 0 })} />
      <CheckField label="Show boundary (E)" checked={showBoundary} onChange={() => controller.toggleBoundary()} />
      {settings.boundary !== 'none' && (
        <>
          <NumberField label="Boundary size" value={settings.boundarySize} validate={positive} onCommit={(boundarySize) => set({ boundarySize })} />
          {settings.boundary === 'box' && (
            <NumberField label="Box depth (z, 0 = same; 3D)" value={settings.boundaryDepth} validate={nonNegative} onCommit={(boundaryDepth) => set({ boundaryDepth })} />
          )}
          <NumberField label="Restitution" value={settings.restitution}
            validate={unitInterval} onCommit={(restitution) => set({ restitution })} />
        </>
      )}
      <NumberField label="Collision distance (0 = off)" value={settings.collisionDistance} validate={nonNegative} onCommit={(collisionDistance) => set({ collisionDistance })} />
      {settings.collisionDistance > 0 && (
        <NumberField label="Collision restitution" value={settings.collisionRestitution}
          validate={unitInterval} onCommit={(collisionRestitution) => set({ collisionRestitution })} />
      )}
      <CheckField label="2D mode" checked={settings.mode2D} onChange={(mode2D) => {
        set({ mode2D });
        controller.resetCamera();
      }} />
      <span />
      <button className="outlined" onClick={() => controller.restoreSettings()}>Restore scenario values</button>
    </div>
  );
}

export function SpacetimeView() {
  const controller = useController();
  const settings = useAppState((s) => s.settings);
  const { maxGamma, clockMin, clockMax } = useAppState((s) => s.spacetime);
  const minkowski = settings.metric === 'minkowski';
  // Switching metric can be refused (maxSpeed set, or a particle at or above c): say why.
  const set = (patch: Partial<SimulationSettings>) => {
    try {
      controller.setSettings(patch);
    } catch (error) {
      controller.notify(`Spacetime: ${(error as Error).message}`, 'error');
    }
  };
  return (
    <div className="stack">
      <div className="grid">
        <SelectField<Metric> label="Metric" value={settings.metric} options={METRICS} onChange={(metric) => set({ metric })} />
        <NumberField label="Speed of light c" value={settings.lightSpeed} validate={positive} onCommit={(lightSpeed) => controller.setSettings({ lightSpeed })} />
        <NumberField label="History depth K (steps)" value={settings.historyDepth}
          validate={(k) => (Number.isInteger(k) && k >= HISTORY_DEPTH_RANGE[0] && k <= controller.maxHistoryDepth ? undefined : `an integer within [${HISTORY_DEPTH_RANGE[0]}, ${controller.maxHistoryDepth}] (this GPU's limit)`)}
          onCommit={(historyDepth) => controller.setSettings({ historyDepth })} />
      </div>
      <p className="muted">
        Retarded forces see each source on the light cone, read from the last K steps: they reach pairs up to
        c·(K − 1)·dt = {format(settings.lightSpeed * (settings.historyDepth - 1) * settings.timeStep, 4)} apart (farther ones see the
        oldest step moved back in uniform motion, flagged on the force) and take {format(controller.historyBytes(settings.historyDepth) / 2 ** 20, 3)} MB of GPU memory
        for the current particles, only while one is enabled under Minkowski (this GPU allows K up to {controller.maxHistoryDepth}).
      </p>
      <p className="muted">
        {minkowski
          ? 'Minkowski, dτ² = dt² − |dx|²/c²: forces change the momentum γmv, so |v| < c, and each clock shows its proper time (moving clocks run slow). Pair forces still act instantaneously in the lab frame.'
          : 'Galilean: classical mechanics, every clock advances by dt. Minkowski gives special relativity with the c above.'}
      </p>
      <dl className="stats">
        <dt>Max γ</dt><dd>{format(maxGamma, 5)}</dd>
        <dt>Max speed / c</dt><dd>{minkowski ? format(Math.sqrt(1 - 1 / maxGamma ** 2), 4) : '—'}</dd>
        <dt>Clocks</dt><dd>{format(clockMin, 5)} to {format(clockMax, 5)}</dd>
      </dl>
    </div>
  );
}

export function ParticleView() {
  const controller = useController();
  const inspected = useAppState((s) => s.inspected);
  const following = useAppState((s) => s.followInspected);
  const showTrail = useAppState((s) => s.showTrail);
  const settings = useAppState((s) => s.settings);
  if (!inspected) return <p className="muted">Click a particle to inspect it.</p>;
  const { index, particle } = inspected;
  const minkowski = settings.metric === 'minkowski';
  const speed = Math.hypot(...particle.velocity);
  const edit = (patch: Partial<typeof particle>) => controller.updateInspected(patch);
  const vector = (label: string, value: readonly number[]) => (
    <><dt>{label}</dt><dd>{value.map((v) => format(v, 4)).join(', ')}</dd></>
  );
  return (
    <div className="stack">
      <dl className="stats">
        <dt>Index</dt><dd>{index}</dd>
        {vector('Position', particle.position)}
        {vector('Velocity', particle.velocity)}
        <dt>Speed</dt><dd>{format(speed, 4)}</dd>
        {minkowski && <><dt>γ</dt><dd>{format(1 / Math.sqrt(1 - (speed / settings.lightSpeed) ** 2), 5)}</dd></>}
        <dt>{minkowski ? 'Proper time' : 'Clock'}</dt><dd>{format(particle.time, 5)}</dd>
      </dl>
      <div className="grid">
        <CheckField label="Fixed" checked={particle.kind === 2} onChange={(fixed) => edit({ kind: fixed ? 2 : 1 })} />
        <NumberField label="Mass" value={particle.mass} validate={positive} onCommit={(mass) => edit({ mass })} />
        <NumberField label="Charge" value={particle.charge} onCommit={(charge) => edit({ charge })} />
        <NumberField label="Charge 2" value={particle.charge2} onCommit={(charge2) => edit({ charge2 })} />
        <Vec3Field label="Spin" value={particle.spin} onCommit={(spin) => edit({ spin })} />
        <NumberField label="Isospin I3" value={particle.isospin} onCommit={(isospin) => edit({ isospin })} />
        <NumberField label="Parity" value={particle.parity} onCommit={(parity) => edit({ parity })} />
        <NumberField label="Nuclear charge" value={particle.nuclearCharge} onCommit={(nuclearCharge) => edit({ nuclearCharge })} />
        <Vec3Field label="Color charge" axes={['r', 'g', 'b']} value={particle.color} onCommit={(color) => edit({ color })} />
      </div>
      <div className="row">
        <button className="outlined" onClick={() => controller.toggleFollow()}>{following ? 'Stop following' : 'Follow'} <kbd>{keyLabel(FOLLOW_KEY)}</kbd></button>
        <button className="outlined" aria-pressed={showTrail} onClick={() => controller.toggleTrail()}>{showTrail ? 'Hide trail' : 'Trail'} <kbd>{keyLabel(TRAIL_KEY)}</kbd></button>
        <button className="outlined" onClick={() => edit({ velocity: [0, 0, 0] })}>Stop</button>
        <button className="danger outlined" onClick={() => controller.removeParticles([index])}>Delete</button>
      </div>
    </div>
  );
}

export function SelectionView({ ctx }: { ctx: ActionContext }) {
  const selection = useAppState((s) => s.selection.length);
  const clipboard = useAppState((s) => s.clipboard.length);
  return (
    <div className="stack">
      <dl className="stats">
        <dt>Selected</dt><dd>{selection}</dd>
        <dt>Clipboard</dt><dd>{clipboard}</dd>
      </dl>
      <p className="muted" style={{ margin: 0 }}>Shift + drag to select. Hold <kbd>Z</kbd> and click to place the clipboard.</p>
      <ActionButtons group="Particles" ctx={ctx} />
    </div>
  );
}

export function GeneratorView() {
  const controller = useController();
  const g = useAppState((s) => s.generator);
  const set = (patch: Partial<typeof g>) => {
    const editsAttributes = SPECIES_FIELDS.some((key) => key in patch);
    controller.setGenerator(editsAttributes ? { ...patch, species: 'custom' } : patch);
  };
  return (
    <div className="stack">
      <div className="grid">
        <SelectField<SpeciesId | 'custom'> label="Species" value={g.species} options={['custom', ...SPECIES_IDS]}
          onChange={(id) => controller.setGenerator(id === 'custom' ? { species: id } : speciesTemplate(id))} />
        <NumberField label="Count" value={g.count} validate={(v) => (Number.isInteger(v) && v >= 1 ? undefined : 'must be an integer >= 1')} onCommit={(count) => set({ count })} />
        <NumberField label="Cloud radius" value={g.cloudRadius} validate={nonNegative} onCommit={(cloudRadius) => set({ cloudRadius })} />
        <NumberField label="Mass" value={g.mass} validate={positive} onCommit={(mass) => set({ mass })} />
        <NumberField label="Charge" value={g.charge} onCommit={(charge) => set({ charge })} />
        <NumberField label="Charge 2" value={g.charge2} onCommit={(charge2) => set({ charge2 })} />
        <SelectField label="Charge sign" value={g.chargeSpread} options={['fixed', 'random sign'] as const} onChange={(chargeSpread) => set({ chargeSpread })} />
        <Vec3Field label="Spin" value={g.spin} onCommit={(spin) => set({ spin })} />
        <NumberField label="Isospin I3" value={g.isospin} onCommit={(isospin) => set({ isospin })} />
        <NumberField label="Parity" value={g.parity} onCommit={(parity) => set({ parity })} />
        <NumberField label="Nuclear charge" value={g.nuclearCharge} onCommit={(nuclearCharge) => set({ nuclearCharge })} />
        <Vec3Field label="Color charge" axes={['r', 'g', 'b']} value={g.color} onCommit={(color) => set({ color })} />
        <NumberField label="Speed" value={g.speed} validate={nonNegative} onCommit={(speed) => set({ speed })} />
        <CheckField label="Fixed" checked={g.fixed} onChange={(fixed) => set({ fixed })} />
      </div>
      <div className="row">
        <button className="primary" onClick={() => controller.generateAt(undefined, undefined)}>Generate at origin</button>
        <button className="outlined" onClick={() => controller.setGenerator(DEFAULT_GENERATOR)}>Restore defaults</button>
      </div>
      <p className="muted" style={{ margin: 0 }}>Press <kbd>G</kbd> over the canvas to generate at the cursor.</p>
    </div>
  );
}

export function FieldView() {
  const controller = useController();
  const field = useAppState((s) => s.field);
  const info = useAppState((s) => s.fieldInfo);
  const error = useAppState((s) => s.fieldError);
  const set = (patch: Partial<typeof field>) => controller.setField(patch);
  const probe = field.probe;
  return (
    <div className="stack">
      {error && <pre className="errors">{error}</pre>}
      <div className="grid">
        <CheckField label="Show field" checked={field.enabled} onChange={(enabled) => set({ enabled })} />
        <CheckField label="Re-fit after camera moves" checked={field.autoRefresh} onChange={(autoRefresh) => set({ autoRefresh })} />
        <CheckField label="Logarithmic colors" checked={field.logScale} onChange={(logScale) => set({ logScale })} />
        <CheckField label="Lock color scale" checked={field.lockScale} onChange={(lockScale) => set({ lockScale })} />
        <NumberField label="Grid columns" value={field.columns} validate={validateColumns} onCommit={(columns) => set({ columns })} />
      </div>
      <h3 className="section-title">Test particle</h3>
      <ProbeFields probe={probe} onChange={(next) => set({ probe: next })} />
      <button className="outlined" onClick={() => set({ probe: DEFAULT_PROBE })}>Default test particle</button>
      {info && (
        <dl className="stats">
          <dt>Probes</dt><dd>{info.columns} × {info.rows}</dd>
          <dt>Spacing</dt><dd>{format(info.spacing, 4)}</dd>
          <dt>|F| at white</dt><dd>{format(info.reference, 4)}</dd>
        </dl>
      )}
      <button className="outlined" disabled={!field.enabled} onClick={() => controller.fitField()}>
        Re-fit to view <kbd>{keyLabel(FIT_FIELD_KEY)}</kbd>
      </button>
      <p className="muted" style={{ margin: 0 }}>
        Arrows show the net force the test particle would feel at each probe. Color runs red to magenta
        up to the 90th percentile of |F| over the probes, white beyond. That scale follows the field, so
        scaling the test particle (charge ×5, mass ×10) looks the same: lock the color scale to compare
        strengths. Sign changes and which charges it carries change the directions.
      </p>
    </div>
  );
}

export function HelpView() {
  return (
    <div>
      <h3 className="section-title">Keyboard</h3>
      <div className="keys">
        {ACTIONS.filter((a) => a.key).map((a) => (
          <Fragment key={a.id}><kbd>{keyLabel(a.key!)}</kbd><span>{a.label}</span></Fragment>
        ))}
      </div>
      <h3 className="section-title">Mouse</h3>
      <div className="keys">
        {POINTER_GESTURES.map(([gesture, effect]) => (
          <Fragment key={gesture}><kbd>{gesture}</kbd><span>{effect}</span></Fragment>
        ))}
      </div>
    </div>
  );
}
