import { useEffect } from 'react';
import { LineChart } from '../components/LineChart';
import { useAppState, useController } from '../context';

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'] as const;

export function StatsView() {
  const controller = useController();
  const physics = useAppState((s) => s.physicsHistory);
  const performance = useAppState((s) => s.performanceHistory);
  const missing = useAppState((s) => s.energyMissing);
  const mode2D = useAppState((s) => s.settings.mode2D);
  const time = physics.map((p) => p.time);
  const wall = performance.map((p) => p.wall - (performance[0]?.wall ?? 0));
  const last = performance[performance.length - 1];

  useEffect(() => {
    controller.setStatsActive(true);
    return () => controller.setStatsActive(false);
  }, [controller]);

  return (
    <div className="stack">
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
          { label: 'Steps/s', color: SERIES[1], values: performance.map((p) => p.stepsPerSecond) },
        ]}
        note={last
          ? `Frame CPU time ${last.frameMs.toFixed(2)} ms (GPU work runs asynchronously and is not included); sampling readback ${last.sampleMs.toFixed(1)} ms per second.`
          : undefined}
      />
      <button className="outlined" onClick={() => controller.clearHistory()}>Clear history</button>
    </div>
  );
}
