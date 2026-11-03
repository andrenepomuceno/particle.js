import { useEffect, useState } from 'react';
import { ParticleKind } from '../../engine/particles';
import type { ParticleGroup } from '../../engine/particleGroups';
import { LineChart } from '../components/LineChart';
import { useAppState, useController, useMessages } from '../context';
import type { Messages } from '../../i18n';
import { Tabs } from '../components/Tabs';

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'] as const;

const TABS = ['charts', 'particles'] as const;
type Tab = (typeof TABS)[number];

export function StatsView() {
  const controller = useController();
  const t = useMessages();
  const [tab, setTab] = useState<Tab>('charts');

  useEffect(() => {
    controller.setStatsActive(true);
    return () => controller.setStatsActive(false);
  }, [controller]);

  return (
    <div className="stack">
      <Tabs tabs={TABS} labels={t.stats.tabs} value={tab} onChange={setTab} />
      {tab === 'charts' ? <ChartsTab /> : <ParticlesTab />}
    </div>
  );
}

function ChartsTab() {
  const controller = useController();
  const { stats: t } = useMessages();
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
        title={t.energy}
        x={time}
        xLabel="t"
        series={[
          { label: t.kinetic, color: SERIES[0], values: physics.map((p) => p.kinetic) },
          { label: t.potential, color: SERIES[1], values: physics.map((p) => p.potential) },
          { label: t.total, color: SERIES[2], values: physics.map((p) => p.total) },
        ]}
        note={missing.length > 0 ? t.energyMissing(missing.join(', ')) : t.energyComplete}
      />
      <LineChart
        title={t.speed}
        x={time}
        xLabel="t"
        zeroBased
        series={[
          { label: t.mean, color: SERIES[0], values: physics.map((p) => p.meanSpeed) },
          { label: t.max, color: SERIES[1], values: physics.map((p) => p.maxSpeed) },
        ]}
      />
      <LineChart
        title={t.temperature}
        x={time}
        xLabel="t"
        zeroBased
        series={[{ label: 'T', color: SERIES[0], values: physics.map((p) => p.temperature) }]}
        note={t.temperatureNote(mode2D)}
      />
      <LineChart
        title={t.performance}
        x={wall}
        xLabel={t.wallSeconds}
        zeroBased
        series={[
          { label: 'FPS', color: SERIES[0], values: performance.map((p) => p.fps) },
          { label: t.frameMs, color: SERIES[1], values: performance.map((p) => p.frameMs) },
        ]}
        note={last ? t.performanceNote(last.sampleMs.toFixed(1)) : undefined}
      />
      <button className="outlined" onClick={() => controller.clearHistory()}>{t.clearHistory}</button>
    </div>
  );
}

const MAX_ROWS = 50;

interface Column {
  id: keyof Messages['stats']['columns'];
  text: (g: ParticleGroup, t: Messages) => string;
}

const num = (x: number): string => String(Number(x.toPrecision(4)));
const triple = (v: readonly number[]): string => v.map(num).join(', ');

const COLUMNS: Column[] = [
  { id: 'kind', text: (g, t) => (g.kind === ParticleKind.fixed ? t.options.kind.fixed : t.options.kind.dynamic) },
  { id: 'mass', text: (g) => num(g.mass) },
  { id: 'charge', text: (g) => num(g.charge) },
  { id: 'charge2', text: (g) => num(g.charge2) },
  { id: 'spin', text: (g) => triple(g.spin) },
  { id: 'isospin', text: (g) => num(g.isospin) },
  { id: 'parity', text: (g) => num(g.parity) },
  { id: 'nuclear', text: (g) => num(g.nuclearCharge) },
  { id: 'color', text: (g) => triple(g.color) },
];

function ParticlesTab() {
  const controller = useController();
  const t = useMessages();
  const { stats: m } = t;
  const particleCount = useAppState((s) => s.particleCount);
  // Regrouped on every render; the version re-renders this after every add, removal or edit (even paused).
  useAppState((s) => s.particlesVersion);
  const groups = controller.particleGroups();
  if (groups.length === 0) return <p className="muted">{m.noParticles}</p>;
  const shown = groups.slice(0, MAX_ROWS);
  const columns = COLUMNS.filter((c) => groups.some((g) => c.text(g, t) !== c.text(groups[0]!, t)));
  const constant = COLUMNS.filter((c) => !columns.includes(c));
  return (
    <div className="stack">
      <table className="groups">
        <thead>
          <tr>
            <th>{m.count}</th><th>%</th><th>{m.species}</th>
            {columns.map((c) => <th key={c.id}>{m.columns[c.id]}</th>)}
          </tr>
        </thead>
        <tbody>
          {shown.map((g, k) => (
            <tr key={k}>
              <td>{g.count}</td>
              <td>{((100 * g.count) / particleCount).toFixed(1)}</td>
              <td>{g.species ? t.species[g.species] : ''}</td>
              {columns.map((c) => <td key={c.id}>{c.text(g, t)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {groups.length > shown.length && <p className="chart-note">{m.moreGroups(groups.length - shown.length)}</p>}
      {constant.length > 0 && (
        <p className="chart-note">{m.sameEverywhere(constant.map((c) => `${m.columns[c.id]} ${c.text(groups[0]!, t)}`).join('; '))}</p>
      )}
    </div>
  );
}
