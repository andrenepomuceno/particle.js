import { useEffect, useState } from 'react';
import { ParticleKind } from '../../engine/particles';
import type { ParticleGroup } from '../../engine/particleGroups';
import { SPECIES } from '../../engine/species';
import { LineChart } from '../components/LineChart';
import { useAppState, useController } from '../context';

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'] as const;

const TABS = ['Charts', 'Particles'] as const;
type Tab = (typeof TABS)[number];

export function StatsView() {
  const controller = useController();
  const [tab, setTab] = useState<Tab>('Charts');

  useEffect(() => {
    controller.setStatsActive(true);
    return () => controller.setStatsActive(false);
  }, [controller]);

  return (
    <div className="stack">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'Charts' ? <ChartsTab /> : <ParticlesTab />}
    </div>
  );
}

function ChartsTab() {
  const controller = useController();
  const physics = useAppState((s) => s.physicsHistory);
  const performance = useAppState((s) => s.performanceHistory);
  const missing = useAppState((s) => s.energyMissing);
  const energyError = useAppState((s) => s.energyError);
  const mode2D = useAppState((s) => s.settings.mode2D);
  const time = physics.map((p) => p.time);
  const wall = performance.map((p) => p.wall - (performance[0]?.wall ?? 0));
  const last = performance[performance.length - 1];

  return (
    <div className="stack">
      {energyError && <pre className="errors">{energyError}</pre>}
      <LineChart
        title="Energy"
        x={time}
        xLabel="t"
        series={[
          { label: 'Kinetic', color: SERIES[0], values: physics.map((p) => p.kinetic) },
          { label: 'Potential', color: SERIES[1], values: physics.map((p) => p.potential) },
          { label: 'Total', color: SERIES[2], values: physics.map((p) => p.total) },
        ]}
        note={missing.length > 0
          ? `Potential energy leaves out forces written as F(r), whose V(r) is unknown: ${missing.join(', ')}. Rewrite them as potentials to include them.`
          : 'Potential includes every enabled force. Short-range cutoffs make V jump at the cutoff, so the total is not exactly conserved.'}
      />
      <LineChart
        title="Speed"
        x={time}
        xLabel="t"
        zeroBased
        series={[
          { label: 'Mean', color: SERIES[0], values: physics.map((p) => p.meanSpeed) },
          { label: 'Max', color: SERIES[1], values: physics.map((p) => p.maxSpeed) },
        ]}
      />
      <LineChart
        title="Temperature"
        x={time}
        xLabel="t"
        zeroBased
        series={[{ label: 'T', color: SERIES[0], values: physics.map((p) => p.temperature) }]}
        note={`Equipartition with k_B = 1: T = ⟨KE⟩ / ${mode2D ? '1 (2D)' : '1.5 (3D)'} per dynamic particle.`}
      />
      <LineChart
        title="Performance"
        x={wall}
        xLabel="wall s"
        zeroBased
        series={[
          { label: 'FPS', color: SERIES[0], values: performance.map((p) => p.fps) },
          { label: 'Frame CPU ms', color: SERIES[1], values: performance.map((p) => p.frameMs) },
        ]}
        note={last
          ? `One simulation step per rendered frame, so steps/s = FPS while running. Frame CPU time excludes the asynchronous GPU work; sampling readback ${last.sampleMs.toFixed(1)} ms per second.`
          : undefined}
      />
      <button className="outlined" onClick={() => controller.clearHistory()}>Clear history</button>
    </div>
  );
}

const MAX_ROWS = 50;

interface Column {
  title: string;
  text: (g: ParticleGroup) => string;
}

const num = (x: number): string => String(Number(x.toPrecision(4)));
const triple = (v: readonly number[]): string => v.map(num).join(', ');

const COLUMNS: Column[] = [
  { title: 'Kind', text: (g) => (g.kind === ParticleKind.fixed ? 'fixed' : 'dynamic') },
  { title: 'Mass', text: (g) => num(g.mass) },
  { title: 'Charge', text: (g) => num(g.charge) },
  { title: 'Charge 2', text: (g) => num(g.charge2) },
  { title: 'Spin', text: (g) => triple(g.spin) },
  { title: 'Isospin', text: (g) => num(g.isospin) },
  { title: 'Parity', text: (g) => num(g.parity) },
  { title: 'Nuclear', text: (g) => num(g.nuclearCharge) },
  { title: 'Color', text: (g) => triple(g.color) },
];

function ParticlesTab() {
  const controller = useController();
  const particleCount = useAppState((s) => s.particleCount);
  // Regrouped on every render; the version re-renders this after every add, removal or edit (even paused).
  useAppState((s) => s.particlesVersion);
  const groups = controller.particleGroups();
  if (groups.length === 0) return <p className="muted">No particles.</p>;
  const shown = groups.slice(0, MAX_ROWS);
  const columns = COLUMNS.filter((c) => groups.some((g) => c.text(g) !== c.text(groups[0]!)));
  const constant = COLUMNS.filter((c) => !columns.includes(c));
  return (
    <div className="stack">
      <table className="groups">
        <thead>
          <tr>
            <th>Count</th><th>%</th><th>Species</th>
            {columns.map((c) => <th key={c.title}>{c.title}</th>)}
          </tr>
        </thead>
        <tbody>
          {shown.map((g, k) => (
            <tr key={k}>
              <td>{g.count}</td>
              <td>{((100 * g.count) / particleCount).toFixed(1)}</td>
              <td>{g.species ? SPECIES[g.species].label : ''}</td>
              {columns.map((c) => <td key={c.title}>{c.text(g)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {groups.length > shown.length && <p className="chart-note">{groups.length - shown.length} more groups</p>}
      {constant.length > 0 && (
        <p className="chart-note">Same in every group: {constant.map((c) => `${c.title} ${c.text(groups[0]!)}`).join('; ')}.</p>
      )}
    </div>
  );
}
