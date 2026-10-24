import { useEffect, useState } from 'react';
import { validateProbe } from '../../engine/field';
import type { CompiledForce } from '../../engine/forces/compile';
import { DEFAULT_PLOT_PARTICLES, type PlotParticles } from '../../engine/forces/resultant';
import { NumberField, nonNegative } from '../components/fields';
import { ProbeFields } from '../components/ProbeFields';
import { useController } from '../context';
import { loadJson, saveJson } from '../persist';
import { RESULTANT_PLOT_KEY } from '../storageKeys';
import { ResultantPotentialPlot } from './ForcePlot';

interface ResultantSettings {
  particles: PlotParticles;
  /** Right edges of the short- and long-range plots; 0 = automatic. */
  shortDistance: number;
  longDistance: number;
}

const DEFAULTS: ResultantSettings = { particles: DEFAULT_PLOT_PARTICLES, shortDistance: 0, longDistance: 0 };

/** Problems with a stored entry (it may come from an older version); empty when usable. */
function problemsOf(saved: ResultantSettings): string[] {
  const { particles, shortDistance, longDistance } = saved;
  if (!particles?.i || !particles?.j) return ['missing particles i and j'];
  const problems = [...validateProbe(particles.i).map((p) => `i: ${p}`), ...validateProbe(particles.j).map((p) => `j: ${p}`)];
  for (const [name, value] of [['shortDistance', shortDistance], ['longDistance', longDistance]] as const) {
    if (!(Number.isFinite(value) && value >= 0)) problems.push(`${name} must be >= 0, got ${value}`);
  }
  return problems;
}

/** Resultant potential plots with their own sample pair and distance range, remembered for the session. */
export function ResultantView({ forces }: { forces: readonly CompiledForce[] }) {
  const controller = useController();
  const [loaded] = useState(() => {
    const saved = loadJson<ResultantSettings>(RESULTANT_PLOT_KEY, DEFAULTS, 'session');
    return { saved, problems: problemsOf(saved) };
  });
  const [settings, setSettings] = useState<ResultantSettings>(loaded.problems.length === 0 ? loaded.saved : DEFAULTS);
  useEffect(() => {
    if (loaded.problems.length > 0) {
      controller.notify(`Saved resultant plot settings were invalid and were reset (${loaded.problems.join('; ')})`, 'error');
    }
  }, [controller, loaded]);
  const update = (patch: Partial<ResultantSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveJson(RESULTANT_PLOT_KEY, next, 'session');
  };
  const auto = (d: number) => (d > 0 ? d : undefined);
  return (
    <div className="stack">
      <ResultantPotentialPlot forces={forces} range="short" particles={settings.particles} maxDistance={auto(settings.shortDistance)} />
      <ResultantPotentialPlot forces={forces} range="long" particles={settings.particles} maxDistance={auto(settings.longDistance)} />
      <details>
        <summary className="muted">Sample pair and range</summary>
        <div className="grid">
          <NumberField label="Short-range plot to (0 = auto)" value={settings.shortDistance} validate={nonNegative} onCommit={(shortDistance) => update({ shortDistance })} />
          <NumberField label="Long-range plot to (0 = auto)" value={settings.longDistance} validate={nonNegative} onCommit={(longDistance) => update({ longDistance })} />
        </div>
        <h4 className="section-title">Particle i (feels the force)</h4>
        <ProbeFields suffix="i" probe={settings.particles.i} onChange={(i) => update({ particles: { ...settings.particles, i } })} />
        <h4 className="section-title">Particle j (exerts it)</h4>
        <ProbeFields suffix="j" probe={settings.particles.j} onChange={(j) => update({ particles: { ...settings.particles, j } })} />
        <button className="outlined" onClick={() => update(DEFAULTS)}>Restore defaults</button>
      </details>
    </div>
  );
}
