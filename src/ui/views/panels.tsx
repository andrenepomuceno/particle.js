import { Fragment, useMemo, useState } from 'react';
import { COLOR_MODES, PARTICLE_STYLES } from '../../engine/render/ParticlePoints';
import { DEFAULT_PROBE, FIELD_COLUMNS_MAX, FIELD_COLUMNS_MIN } from '../../engine/field';
import { ProbeFields } from '../components/ProbeFields';
import { HISTORY_DEPTH_RANGE, INTEGRATORS, METRICS, type BoundaryShape, type Metric, type SimulationSettings } from '../../engine/settings';
import { DEFAULT_GENERATOR, FPS_LIMITS, MAX_CAPACITY } from '../../app/SimulationController';
import { loadJson, saveJson } from '../persist';
import { PARTICLE_TARGET_KEY, SCENARIO_FOLDERS_KEY, SCENARIO_ORDER_KEY } from '../storageKeys';
import { SPECIES, SPECIES_IDS, type SpeciesId } from '../../engine/species';
import { SCENARIOS } from '../../scenarios';
import { listedScenarios, orderScenarios, SCENARIO_ORDERS, scenarioFolders, type ScenarioOrder } from '../../scenarios/order';
import type { ScenarioSource } from '../../scenarios/source';
import type { Scenario } from '../../scenarios/types';
import { ACTIONS, download, keyLabel, type Action, type ActionContext } from '../actions';
import { localizeFolder, localizeScenario, scenarioNaming } from '../../i18n/scenarios';
import type { Locale, Messages } from '../../i18n';
import { Rich } from '../components/Rich';
import { CheckField, NumberField, SelectField, Vec3Field, useValidators } from '../components/fields';
import { useAppState, useController, useMessages } from '../context';
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

const fpsLimitLabel = (limit: number, t: Messages) => (limit === 0 ? t.options.fpsDisplayRate : String(limit));

const format = (value: number, digits = 3) => (Number.isInteger(value) ? String(value) : value.toPrecision(digits));

const INFO_TABS = ['overview', 'scenarios', 'json'] as const;
type InfoTab = (typeof INFO_TABS)[number];

/** The JSON tab's text, tied to the world source it started from; `error` is the last failed apply. */
interface JsonDraft {
  source: ScenarioSource | undefined;
  text: string;
  error: string | undefined;
}

const freshDraft = (source: ScenarioSource | undefined): JsonDraft => ({ source, text: source?.text ?? '', error: undefined });

export function InfoView() {
  const t = useMessages();
  const [tab, setTab] = useState<InfoTab>('overview');
  const source = useAppState((s) => s.scenarioSource);
  // Held above the tabs so switching tabs keeps unapplied edits; only a new world source
  // (another scenario or file loaded, or an applied edit) replaces it. R keeps the same source.
  const [draft, setDraft] = useState(() => freshDraft(source));
  if (draft.source !== source) setDraft(freshDraft(source));
  return (
    <div className="stack">
      <Tabs tabs={INFO_TABS} labels={t.info.tabs} value={tab} onChange={setTab} />
      {tab === 'overview' && <OverviewTab />}
      {tab === 'scenarios' && <ScenariosTab />}
      {tab === 'json' && <JsonTab draft={draft} onChange={setDraft} />}
    </div>
  );
}

const scenarioLabel = (s: Scenario, order: ScenarioOrder, locale: Locale) => {
  const { name, folder } = localizeScenario(s, locale);
  return order === 'name' ? `${name} (${folder})` : `${folder} / ${name}`;
};

function OverviewTab() {
  const controller = useController();
  const t = useMessages();
  const { integerWithin } = useValidators();
  const locale = useAppState((s) => s.locale);
  const fileName = useAppState((s) => s.name);
  const snapshotFile = useAppState((s) => s.snapshotFile);
  const scenarioId = useAppState((s) => s.scenarioId);
  const count = useAppState((s) => s.particleCount);
  const capacity = useAppState((s) => s.capacity);
  const time = useAppState((s) => Math.round(s.time * 100) / 100);
  const fps = useAppState((s) => Math.round(s.fps));
  const timeline = useAppState((s) => s.timeline);
  const averageSpeed = useAppState((s) => s.averageSpeed);
  const paused = useAppState((s) => s.paused);
  const forces = useAppState((s) => s.forces.filter((f) => f.enabled).length);
  const fileDescription = useAppState((s) => s.description);
  const edited = useAppState((s) => s.scenarioSource !== undefined && s.scenarioSource.text !== s.scenarioSource.original);
  const target = useAppState((s) => s.particleTarget);
  const bundled = SCENARIOS.find((s) => s.id === scenarioId);
  const defaultCount = bundled?.defaultCount;
  // A bundled scenario reads in the interface language; imported and edited files keep their own text.
  const { name, description } = bundled ? localizeScenario(bundled, locale)
    : { name: fileName, description: snapshotFile !== undefined ? t.info.snapshotFrom(snapshotFile) : fileDescription };
  const seed = useAppState((s) => s.seed);
  const order = useAppState((s) => s.scenarioOrder);
  const byFolder = useAppState((s) => s.scenariosByFolder);
  // This tab re-renders with the clock; the list only changes with the order, grouping or language.
  const listed = useMemo(() => listedScenarios(SCENARIOS, order, byFolder, scenarioNaming(locale)), [order, byFolder, locale]);
  const applyTarget = (value: number | undefined) => {
    controller.setParticleTarget(value);
    saveJson(PARTICLE_TARGET_KEY, value ?? null);
  };
  const attempt = (label: string, action: () => void) => {
    try {
      action();
    } catch (error) {
      controller.notify(t.failed(label, (error as Error).message), 'error');
    }
  };

  return (
    <div className="stack">
      <select aria-label={t.info.scenario} value={scenarioId} onChange={(e) => attempt(t.info.loadingScenario, () => controller.loadScenario(e.target.value))}>
        {scenarioId === '' && <option value="">{name} ({edited ? t.info.edited : t.info.imported})</option>}
        {listed.map((s) => <option key={s.id} value={s.id}>{scenarioLabel(s, order, locale)}</option>)}
      </select>
      {description && <p className="muted" style={{ margin: 0 }}>{description}</p>}
      {defaultCount === 0 && target === undefined ? (
        <p className="muted" style={{ margin: 0 }}>{t.info.startsEmpty}</p>
      ) : (
      <div className="grid">
        <NumberField label={t.info.particleTarget} value={target ?? defaultCount ?? count}
          validate={integerWithin(1, MAX_CAPACITY)}
          onCommit={(v) => applyTarget(v)} />
      </div>
      )}
      <div className="row">
        <button className="outlined" onClick={() => attempt(t.info.reset, () => controller.reset())}>{t.info.applyReset} <kbd>R</kbd></button>
        {target !== undefined && <button className="outlined" onClick={() => applyTarget(undefined)}>{t.info.useDefault(defaultCount)}</button>}
      </div>
      <dl className="stats">
        <dt>{t.info.status}</dt><dd>{paused ? t.info.paused : t.info.running}</dd>
        <dt>{t.info.particles}</dt><dd>{count} / {capacity}</dd>
        <dt>{t.info.activeForces}</dt><dd>{forces}</dd>
        <dt>{t.info.time}</dt><dd>{time}</dd>
        <dt>{t.info.meanSpeed}</dt><dd>{format(averageSpeed)}</dd>
        <dt>{t.info.fps}</dt><dd>{fps}</dd>
        {seed && <><dt>{t.info.seed}</dt><dd title={seed.fixed ? t.info.seedFixedTitle : t.info.seedRandomTitle}>{seed.value} ({seed.fixed ? t.info.seedFixed : t.info.seedRandom})</dd></>}
        {timeline.total > 0 && (
          <><dt>{t.info.script}</dt><dd>{t.info.events(timeline.fired, timeline.total)}{timeline.nextAt !== undefined ? t.info.nextAt(timeline.nextAt) : ''}</dd></>
        )}
      </dl>
      <p className="muted" style={{ margin: 0 }}><Rich text={t.info.footer(__APP_VERSION__)} /></p>
    </div>
  );
}

/** The library as a list: collapsible folders (remembered) or flat, in the chosen order. */
function ScenariosTab() {
  const controller = useController();
  const t = useMessages();
  const locale = useAppState((s) => s.locale);
  const naming = scenarioNaming(locale);
  const scenarioId = useAppState((s) => s.scenarioId);
  const order = useAppState((s) => s.scenarioOrder);
  const byFolder = useAppState((s) => s.scenariosByFolder);
  const [expanded, setExpanded] = useState<string[]>(() => {
    const stored = loadJson<unknown>(SCENARIO_FOLDERS_KEY, null);
    if (Array.isArray(stored) && stored.every((f) => typeof f === 'string')) return stored;
    const current = SCENARIOS.find((s) => s.id === scenarioId);
    return current ? [current.folder] : [];
  });
  const folders = scenarioFolders(SCENARIOS, order, naming);
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
      controller.notify(t.failed(t.info.loadingScenario, (error as Error).message), 'error');
    }
  };
  const item = (s: Scenario, showFolder: boolean) => {
    const text = localizeScenario(s, locale);
    return (
      <li key={s.id}>
        <button className={s.id === scenarioId ? 'scenario-item active' : 'scenario-item'} aria-current={s.id === scenarioId} title={text.description} onClick={() => load(s.id)}>
          <span>{text.name}</span>
          <span className="muted">{[showFolder && text.folder, order === 'newest' && s.added?.slice(0, 10)].filter(Boolean).join(' · ')}</span>
        </button>
      </li>
    );
  };
  return (
    <div className="stack">
      <div className="grid">
        <SelectField<ScenarioOrder> label={t.info.order} value={order} options={SCENARIO_ORDERS} optionLabel={(o) => t.options.scenarioOrder[o]} onChange={(next) => setOrder(next, byFolder)} />
        <CheckField label={t.info.groupByFolder} checked={byFolder} onChange={(next) => setOrder(order, next)} />
      </div>
      {byFolder && (
        <div className="row">
          <button className="outlined" onClick={() => expand(folders.map((f) => f.folder))}>{t.info.expandAll}</button>
          <button className="outlined" onClick={() => expand([])}>{t.info.collapseAll}</button>
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
                  {open ? '▾' : '▸'} {localizeFolder(folder, locale)} <span className="muted">{scenarios.length}</span>
                </button>
                {open && <ul className="scenario-list">{scenarios.map((s) => item(s, false))}</ul>}
              </section>
            );
          })}
        </>
      ) : (
        <ul className="scenario-list">{orderScenarios(SCENARIOS, order, naming).map((s) => item(s, true))}</ul>
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
  const t = useMessages();
  const target = useAppState((s) => s.particleTarget);
  const { source, text, error } = draft;
  if (!source) {
    return <p className="muted" style={{ margin: 0 }}>{t.info.noJson}</p>;
  }
  const apply = () => {
    try {
      controller.applyScenarioEdit(text);
      controller.notify(t.info.appliedEdit(source.file));
    } catch (failure) {
      onChange({ ...draft, error: (failure as Error).message });
    }
  };
  const status = text !== source.text ? t.info.unapplied : source.text !== source.original ? t.info.editApplied : t.info.asLoaded;
  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>{source.file} · {status}</p>
      <textarea className={error ? 'json-editor invalid' : 'json-editor'} aria-label={t.info.jsonLabel} spellCheck={false} value={text}
        onChange={(event) => onChange({ ...draft, text: event.target.value })} />
      {error && <pre className="errors">{error}</pre>}
      {target !== undefined && (
        <p className="muted" style={{ margin: 0 }}>{t.info.rescaled(target)}</p>
      )}
      <div className="row">
        <button className="primary" onClick={apply}>{t.info.applyReset}</button>
        <button className="outlined" disabled={text === source.original} onClick={() => onChange({ ...draft, text: source.original, error: undefined })}>{t.info.revert}</button>
        <button className="outlined" onClick={() => download(new Blob([text], { type: 'application/json' }), `${source.id}.json`)}>{t.info.download}</button>
      </div>
    </div>
  );
}

function ActionButtons({ group, ctx }: { group: Action['group']; ctx: ActionContext }) {
  const t = useMessages();
  return (
    <div className="stack">
      {ACTIONS.filter((a) => a.group === group).map((action) => (
        <button key={action.id} className="outlined" style={{ textAlign: 'left' }} onClick={() => action.run(ctx)}>
          {t.actions[action.id]} {action.key && <kbd style={{ float: 'right' }}>{keyLabel(action.key, t)}</kbd>}
        </button>
      ))}
    </div>
  );
}

export function ControlsView({ ctx }: { ctx: ActionContext }) {
  const controller = useController();
  const t = useMessages();
  const { positive } = useValidators();
  const colorMode = useAppState((s) => s.colorMode);
  const radius = useAppState((s) => s.particleRadius);
  const style = useAppState((s) => s.particleStyle);
  const sizeByMass = useAppState((s) => s.sizeByMass);
  const fpsLimit = useAppState((s) => s.fpsLimit);
  return (
    <div>
      {(['Simulation', 'Camera', 'View'] as const).map((group) => (
        <Fragment key={group}>
          <h3 className="section-title">{t.actionGroups[group]}</h3>
          <ActionButtons group={group} ctx={ctx} />
        </Fragment>
      ))}
      <div className="grid" style={{ marginTop: 8 }}>
        <SelectField label={t.controls.fpsLimit} value={String(fpsLimit)} options={FPS_LIMITS.map(String)} optionLabel={(l) => fpsLimitLabel(Number(l), t)}
          onChange={(l) => controller.setFpsLimit(FPS_LIMITS.find((limit) => String(limit) === l)!)} />
        <SelectField label={t.controls.particleStyle} value={style} options={PARTICLE_STYLES} optionLabel={(s) => t.options.particleStyle[s]} onChange={(s) => controller.setParticleStyle(s)} />
        <SelectField label={t.controls.colorBy} value={colorMode} options={COLOR_MODES} optionLabel={(m) => t.options.colorMode[m]} onChange={(m) => controller.setColorMode(m)} />
        <NumberField label={t.controls.particleRadius} value={radius} validate={positive} onCommit={(r) => controller.setParticleRadius(r)} />
        <CheckField label={t.controls.sizeByMass} checked={sizeByMass} onChange={(on) => controller.setSizeByMass(on)} />
      </div>
    </div>
  );
}

export function ParametersView() {
  const controller = useController();
  const { parameters: t, options } = useMessages();
  const { positive, nonNegative, unitInterval } = useValidators();
  const settings = useAppState((s) => s.settings);
  const showBoundary = useAppState((s) => s.showBoundary);
  const set = (patch: Parameters<typeof controller.setSettings>[0]) => controller.setSettings(patch);
  return (
    <div className="grid">
      <SelectField label={t.integrator} value={settings.integrator} options={INTEGRATORS} optionLabel={(i) => options.integrator[i]} onChange={(integrator) => set({ integrator })} />
      <NumberField label={t.timeStep} value={settings.timeStep} validate={positive} onCommit={(timeStep) => set({ timeStep })} />
      <NumberField label={t.friction} value={settings.friction} validate={nonNegative} onCommit={(friction) => set({ friction })} />
      <NumberField label={t.quadraticDrag} value={settings.quadraticDrag} validate={nonNegative} onCommit={(quadraticDrag) => set({ quadraticDrag })} />
      <NumberField label={t.maxSpeed} value={settings.maxSpeed} validate={nonNegative} onCommit={(maxSpeed) => set({ maxSpeed })} />
      {/* A slab depth only exists for boxes: leaving the box clears it, and the field disappears with it. */}
      <SelectField<BoundaryShape> label={t.boundary} value={settings.boundary} options={['none', 'sphere', 'box']} optionLabel={(b) => options.boundary[b]}
        onChange={(boundary) => set(boundary === 'box' ? { boundary } : { boundary, boundaryDepth: 0 })} />
      <CheckField label={t.showBoundary} checked={showBoundary} onChange={() => controller.toggleBoundary()} />
      {settings.boundary !== 'none' && (
        <>
          <NumberField label={t.boundarySize} value={settings.boundarySize} validate={positive} onCommit={(boundarySize) => set({ boundarySize })} />
          {settings.boundary === 'box' && (
            <NumberField label={t.boxDepth} value={settings.boundaryDepth} validate={nonNegative} onCommit={(boundaryDepth) => set({ boundaryDepth })} />
          )}
          <NumberField label={t.restitution} value={settings.restitution}
            validate={unitInterval} onCommit={(restitution) => set({ restitution })} />
        </>
      )}
      <NumberField label={t.collisionDistance} value={settings.collisionDistance} validate={nonNegative} onCommit={(collisionDistance) => set({ collisionDistance })} />
      {settings.collisionDistance > 0 && (
        <NumberField label={t.collisionRestitution} value={settings.collisionRestitution}
          validate={unitInterval} onCommit={(collisionRestitution) => set({ collisionRestitution })} />
      )}
      <CheckField label={t.mode2D} checked={settings.mode2D} onChange={(mode2D) => {
        set({ mode2D });
        controller.resetCamera();
      }} />
      <span />
      <button className="outlined" onClick={() => controller.restoreSettings()}>{t.restore}</button>
    </div>
  );
}

export function SpacetimeView() {
  const controller = useController();
  const { spacetime: t, options } = useMessages();
  const { positive } = useValidators();
  const settings = useAppState((s) => s.settings);
  const { maxGamma, clockMin, clockMax } = useAppState((s) => s.spacetime);
  const minkowski = settings.metric === 'minkowski';
  // Switching metric can be refused (maxSpeed set, or a particle at or above c): say why.
  const set = (patch: Partial<SimulationSettings>) => {
    try {
      controller.setSettings(patch);
    } catch (error) {
      controller.notify(t.failed((error as Error).message), 'error');
    }
  };
  return (
    <div className="stack">
      <div className="grid">
        <SelectField<Metric> label={t.metric} value={settings.metric} options={METRICS} optionLabel={(m) => options.metric[m]} onChange={(metric) => set({ metric })} />
        <NumberField label={t.lightSpeed} value={settings.lightSpeed} validate={positive} onCommit={(lightSpeed) => controller.setSettings({ lightSpeed })} />
        <NumberField label={t.historyDepth} value={settings.historyDepth}
          validate={(k) => (Number.isInteger(k) && k >= HISTORY_DEPTH_RANGE[0] && k <= controller.maxHistoryDepth ? undefined : t.historyDepthInvalid(HISTORY_DEPTH_RANGE[0], controller.maxHistoryDepth))}
          onCommit={(historyDepth) => controller.setSettings({ historyDepth })} />
      </div>
      <p className="muted">
        {t.reach(format(settings.lightSpeed * (settings.historyDepth - 1) * settings.timeStep, 4), format(controller.historyBytes(settings.historyDepth) / 2 ** 20, 3), controller.maxHistoryDepth)}
      </p>
      <p className="muted">{minkowski ? t.minkowski : t.galilean}</p>
      <dl className="stats">
        <dt>{t.maxGamma}</dt><dd>{format(maxGamma, 5)}</dd>
        <dt>{t.maxSpeedOverC}</dt><dd>{minkowski ? format(Math.sqrt(1 - 1 / maxGamma ** 2), 4) : '—'}</dd>
        <dt>{t.clocks}</dt><dd>{t.clockRange(format(clockMin, 5), format(clockMax, 5))}</dd>
      </dl>
    </div>
  );
}

export function ParticleView() {
  const controller = useController();
  const t = useMessages();
  const { particle: m, attributes: a } = t;
  const { positive } = useValidators();
  const inspected = useAppState((s) => s.inspected);
  const following = useAppState((s) => s.followInspected);
  const showTrail = useAppState((s) => s.showTrail);
  const settings = useAppState((s) => s.settings);
  if (!inspected) return <p className="muted">{m.clickToInspect}</p>;
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
        <dt>{m.index}</dt><dd>{index}</dd>
        {vector(m.position, particle.position)}
        {vector(m.velocity, particle.velocity)}
        <dt>{m.speed}</dt><dd>{format(speed, 4)}</dd>
        {minkowski && <><dt>γ</dt><dd>{format(1 / Math.sqrt(1 - (speed / settings.lightSpeed) ** 2), 5)}</dd></>}
        <dt>{minkowski ? m.properTime : m.clock}</dt><dd>{format(particle.time, 5)}</dd>
      </dl>
      <div className="grid">
        <CheckField label={a.fixed} checked={particle.kind === 2} onChange={(fixed) => edit({ kind: fixed ? 2 : 1 })} />
        <NumberField label={a.mass} value={particle.mass} validate={positive} onCommit={(mass) => edit({ mass })} />
        <NumberField label={a.charge} value={particle.charge} onCommit={(charge) => edit({ charge })} />
        <NumberField label={a.charge2} value={particle.charge2} onCommit={(charge2) => edit({ charge2 })} />
        <Vec3Field label={a.spin} value={particle.spin} onCommit={(spin) => edit({ spin })} />
        <NumberField label={a.isospin} value={particle.isospin} onCommit={(isospin) => edit({ isospin })} />
        <NumberField label={a.parity} value={particle.parity} onCommit={(parity) => edit({ parity })} />
        <NumberField label={a.nuclearCharge} value={particle.nuclearCharge} onCommit={(nuclearCharge) => edit({ nuclearCharge })} />
        <Vec3Field label={a.colorCharge} axes={['r', 'g', 'b']} value={particle.color} onCommit={(color) => edit({ color })} />
      </div>
      <div className="row">
        <button className="outlined" onClick={() => controller.toggleFollow()}>{following ? m.stopFollowing : m.follow} <kbd>{keyLabel(FOLLOW_KEY, t)}</kbd></button>
        <button className="outlined" aria-pressed={showTrail} onClick={() => controller.toggleTrail()}>{showTrail ? m.hideTrail : m.trail} <kbd>{keyLabel(TRAIL_KEY, t)}</kbd></button>
        <button className="outlined" onClick={() => edit({ velocity: [0, 0, 0] })}>{m.stop}</button>
        <button className="danger outlined" onClick={() => controller.removeParticles([index])}>{m.delete}</button>
      </div>
    </div>
  );
}

export function SelectionView({ ctx }: { ctx: ActionContext }) {
  const { selection: t } = useMessages();
  const selection = useAppState((s) => s.selection.length);
  const clipboard = useAppState((s) => s.clipboard.length);
  return (
    <div className="stack">
      <dl className="stats">
        <dt>{t.selected}</dt><dd>{selection}</dd>
        <dt>{t.clipboard}</dt><dd>{clipboard}</dd>
      </dl>
      <p className="muted" style={{ margin: 0 }}><Rich text={t.hint} /></p>
      <ActionButtons group="Particles" ctx={ctx} />
    </div>
  );
}

export function GeneratorView() {
  const controller = useController();
  const { generator: t, attributes: a, options, species } = useMessages();
  const { positive, nonNegative, integerAtLeast } = useValidators();
  const g = useAppState((s) => s.generator);
  const set = (patch: Partial<typeof g>) => {
    const editsAttributes = SPECIES_FIELDS.some((key) => key in patch);
    controller.setGenerator(editsAttributes ? { ...patch, species: 'custom' } : patch);
  };
  return (
    <div className="stack">
      <div className="grid">
        <SelectField<SpeciesId | 'custom'> label={t.species} value={g.species} options={['custom', ...SPECIES_IDS]}
          optionLabel={(id) => (id === 'custom' ? options.customSpecies : species[id])}
          onChange={(id) => controller.setGenerator(id === 'custom' ? { species: id } : speciesTemplate(id))} />
        <NumberField label={t.count} value={g.count} validate={integerAtLeast(1)} onCommit={(count) => set({ count })} />
        <NumberField label={t.cloudRadius} value={g.cloudRadius} validate={nonNegative} onCommit={(cloudRadius) => set({ cloudRadius })} />
        <NumberField label={a.mass} value={g.mass} validate={positive} onCommit={(mass) => set({ mass })} />
        <NumberField label={a.charge} value={g.charge} onCommit={(charge) => set({ charge })} />
        <NumberField label={a.charge2} value={g.charge2} onCommit={(charge2) => set({ charge2 })} />
        <SelectField label={t.chargeSign} value={g.chargeSpread} options={['fixed', 'random sign'] as const} optionLabel={(c) => options.chargeSpread[c]} onChange={(chargeSpread) => set({ chargeSpread })} />
        <Vec3Field label={a.spin} value={g.spin} onCommit={(spin) => set({ spin })} />
        <NumberField label={a.isospin} value={g.isospin} onCommit={(isospin) => set({ isospin })} />
        <NumberField label={a.parity} value={g.parity} onCommit={(parity) => set({ parity })} />
        <NumberField label={a.nuclearCharge} value={g.nuclearCharge} onCommit={(nuclearCharge) => set({ nuclearCharge })} />
        <Vec3Field label={a.colorCharge} axes={['r', 'g', 'b']} value={g.color} onCommit={(color) => set({ color })} />
        <NumberField label={t.speed} value={g.speed} validate={nonNegative} onCommit={(speed) => set({ speed })} />
        <CheckField label={a.fixed} checked={g.fixed} onChange={(fixed) => set({ fixed })} />
      </div>
      <div className="row">
        <button className="primary" onClick={() => controller.generateAt(undefined, undefined)}>{t.generateAtOrigin}</button>
        <button className="outlined" onClick={() => controller.setGenerator(DEFAULT_GENERATOR)}>{t.restoreDefaults}</button>
      </div>
      <p className="muted" style={{ margin: 0 }}><Rich text={t.hint} /></p>
    </div>
  );
}

export function FieldView() {
  const controller = useController();
  const messages = useMessages();
  const { field: t } = messages;
  const { integerWithin } = useValidators();
  const field = useAppState((s) => s.field);
  const info = useAppState((s) => s.fieldInfo);
  const errorLog = useAppState((s) => s.fieldErrorLog);
  const set = (patch: Partial<typeof field>) => controller.setField(patch);
  const probe = field.probe;
  return (
    <div className="stack">
      {errorLog !== undefined && <pre className="errors">{messages.notices.fieldCompileFailed(errorLog)}</pre>}
      <div className="grid">
        <CheckField label={t.show} checked={field.enabled} onChange={(enabled) => set({ enabled })} />
        <CheckField label={t.autoRefresh} checked={field.autoRefresh} onChange={(autoRefresh) => set({ autoRefresh })} />
        <CheckField label={t.logScale} checked={field.logScale} onChange={(logScale) => set({ logScale })} />
        <CheckField label={t.lockScale} checked={field.lockScale} onChange={(lockScale) => set({ lockScale })} />
        <NumberField label={t.columns} value={field.columns} validate={integerWithin(FIELD_COLUMNS_MIN, FIELD_COLUMNS_MAX)} onCommit={(columns) => set({ columns })} />
      </div>
      <h3 className="section-title">{t.testParticle}</h3>
      <ProbeFields probe={probe} onChange={(next) => set({ probe: next })} />
      <button className="outlined" onClick={() => set({ probe: DEFAULT_PROBE })}>{t.defaultTestParticle}</button>
      {info && (
        <dl className="stats">
          <dt>{t.probes}</dt><dd>{info.columns} × {info.rows}</dd>
          <dt>{t.spacing}</dt><dd>{format(info.spacing, 4)}</dd>
          <dt>{t.reference}</dt><dd>{format(info.reference, 4)}</dd>
        </dl>
      )}
      <button className="outlined" disabled={!field.enabled} onClick={() => controller.fitField()}>
        {t.refit} <kbd>{keyLabel(FIT_FIELD_KEY, messages)}</kbd>
      </button>
      <p className="muted" style={{ margin: 0 }}>{t.explanation}</p>
    </div>
  );
}

export function HelpView() {
  const t = useMessages();
  return (
    <div>
      <h3 className="section-title">{t.help.keyboard}</h3>
      <div className="keys">
        {ACTIONS.filter((a) => a.key).map((a) => (
          <Fragment key={a.id}><kbd>{keyLabel(a.key!, t)}</kbd><span>{t.actions[a.id]}</span></Fragment>
        ))}
      </div>
      <h3 className="section-title">{t.help.mouse}</h3>
      <div className="keys">
        {t.pointerGestures.map(([gesture, effect]) => (
          <Fragment key={gesture}><kbd>{gesture}</kbd><span>{effect}</span></Fragment>
        ))}
      </div>
    </div>
  );
}
