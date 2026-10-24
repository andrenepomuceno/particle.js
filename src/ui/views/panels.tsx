import { Fragment } from 'react';
import { COLOR_MODES, PARTICLE_STYLES } from '../../engine/render/ParticlePoints';
import type { BoundaryShape } from '../../engine/settings';
import { FPS_LIMITS } from '../../app/SimulationController';
import { SCENARIOS } from '../../scenarios';
import { ACTIONS, keyLabel, POINTER_GESTURES, type Action, type ActionContext } from '../actions';
import { CheckField, NumberField, SelectField, nonNegative, positive } from '../components/fields';
import { useAppState, useController } from '../context';

const fpsLimitLabel = (limit: number) => (limit === 0 ? 'display rate' : String(limit));

const format = (value: number, digits = 3) => (Number.isInteger(value) ? String(value) : value.toPrecision(digits));

export function InfoView() {
  const controller = useController();
  const name = useAppState((s) => s.name);
  const scenarioId = useAppState((s) => s.scenarioId);
  const count = useAppState((s) => s.particleCount);
  const capacity = useAppState((s) => s.capacity);
  const time = useAppState((s) => Math.round(s.time * 100) / 100);
  const fps = useAppState((s) => Math.round(s.fps));
  const averageSpeed = useAppState((s) => s.averageSpeed);
  const paused = useAppState((s) => s.paused);
  const forces = useAppState((s) => s.forces.filter((f) => f.enabled).length);
  const description = useAppState((s) => s.description);

  return (
    <div className="stack">
      <select aria-label="Scenario" value={scenarioId} onChange={(e) => controller.loadScenario(e.target.value)}>
        {scenarioId === '' && <option value="">{name} (imported)</option>}
        {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.folder} / {s.name}</option>)}
      </select>
      {description && <p className="muted" style={{ margin: 0 }}>{description}</p>}
      <dl className="stats">
        <dt>Status</dt><dd>{paused ? 'paused' : 'running'}</dd>
        <dt>Particles</dt><dd>{count} / {capacity}</dd>
        <dt>Active forces</dt><dd>{forces}</dd>
        <dt>Time</dt><dd>{time}</dd>
        <dt>Mean speed</dt><dd>{format(averageSpeed)}</dd>
        <dt>FPS</dt><dd>{fps}</dd>
      </dl>
      <p className="muted" style={{ margin: 0 }}>v{__APP_VERSION__} · press <kbd>?</kbd> for shortcuts</p>
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
  const set = (patch: Parameters<typeof controller.setSettings>[0]) => controller.setSettings(patch);
  return (
    <div className="grid">
      <NumberField label="Time step" value={settings.timeStep} validate={positive} onCommit={(timeStep) => set({ timeStep })} />
      <NumberField label="Friction" value={settings.friction} validate={nonNegative} onCommit={(friction) => set({ friction })} />
      <NumberField label="Max speed (0 = off)" value={settings.maxSpeed} validate={nonNegative} onCommit={(maxSpeed) => set({ maxSpeed })} />
      <SelectField<BoundaryShape> label="Boundary" value={settings.boundary} options={['none', 'sphere', 'box']} onChange={(boundary) => set({ boundary })} />
      {settings.boundary !== 'none' && (
        <>
          <NumberField label="Boundary size" value={settings.boundarySize} validate={positive} onCommit={(boundarySize) => set({ boundarySize })} />
          <NumberField label="Restitution" value={settings.restitution}
            validate={(v) => (v >= 0 && v <= 1 ? undefined : 'must be within [0, 1]')} onCommit={(restitution) => set({ restitution })} />
        </>
      )}
      <CheckField label="2D mode" checked={settings.mode2D} onChange={(mode2D) => {
        set({ mode2D });
        controller.resetCamera();
      }} />
    </div>
  );
}

export function ParticleView() {
  const controller = useController();
  const inspected = useAppState((s) => s.inspected);
  const following = useAppState((s) => s.followInspected);
  if (!inspected) return <p className="muted">Click a particle to inspect it.</p>;
  const { index, particle } = inspected;
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
        <dt>Speed</dt><dd>{format(Math.hypot(...particle.velocity), 4)}</dd>
        <dt>Clock</dt><dd>{format(particle.time, 5)}</dd>
      </dl>
      <div className="grid">
        <CheckField label="Fixed" checked={particle.kind === 2} onChange={(fixed) => edit({ kind: fixed ? 2 : 1 })} />
        <NumberField label="Mass" value={particle.mass} validate={positive} onCommit={(mass) => edit({ mass })} />
        <NumberField label="Charge" value={particle.charge} onCommit={(charge) => edit({ charge })} />
        <NumberField label="Spin" value={particle.spin} onCommit={(spin) => edit({ spin })} />
        <NumberField label="Parity" value={particle.parity} onCommit={(parity) => edit({ parity })} />
        {(['red', 'green', 'blue'] as const).map((channel, k) => (
          <NumberField key={channel} label={`Color ${channel}`} value={particle.color[k]!}
            onCommit={(v) => edit({ color: particle.color.map((c, j) => (j === k ? v : c)) as typeof particle.color })} />
        ))}
      </div>
      <div className="row">
        <button className="outlined" onClick={() => controller.toggleFollow()}>{following ? 'Stop following' : 'Follow'} <kbd>F</kbd></button>
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
  const set = (patch: Partial<typeof g>) => controller.setGenerator(patch);
  return (
    <div className="stack">
      <div className="grid">
        <NumberField label="Count" value={g.count} validate={(v) => (Number.isInteger(v) && v >= 1 ? undefined : 'must be an integer >= 1')} onCommit={(count) => set({ count })} />
        <NumberField label="Cloud radius" value={g.cloudRadius} validate={nonNegative} onCommit={(cloudRadius) => set({ cloudRadius })} />
        <NumberField label="Mass" value={g.mass} validate={positive} onCommit={(mass) => set({ mass })} />
        <NumberField label="Charge" value={g.charge} onCommit={(charge) => set({ charge })} />
        <SelectField label="Charge sign" value={g.chargeSpread} options={['fixed', 'random sign'] as const} onChange={(chargeSpread) => set({ chargeSpread })} />
        <NumberField label="Spin" value={g.spin} onCommit={(spin) => set({ spin })} />
        <NumberField label="Parity" value={g.parity} onCommit={(parity) => set({ parity })} />
        {(['red', 'green', 'blue'] as const).map((channel, k) => (
          <NumberField key={channel} label={`Color ${channel}`} value={g.color[k]!}
            onCommit={(v) => set({ color: g.color.map((c, j) => (j === k ? v : c)) as typeof g.color })} />
        ))}
        <NumberField label="Speed" value={g.speed} validate={nonNegative} onCommit={(speed) => set({ speed })} />
        <CheckField label="Fixed" checked={g.fixed} onChange={(fixed) => set({ fixed })} />
      </div>
      <button className="primary" onClick={() => controller.generateAt(undefined, undefined)}>Generate at origin</button>
      <p className="muted" style={{ margin: 0 }}>Press <kbd>G</kbd> over the canvas to generate at the cursor.</p>
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
