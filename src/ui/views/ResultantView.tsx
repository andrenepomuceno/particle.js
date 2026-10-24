import { useState } from 'react';
import type { FieldProbe } from '../../engine/field';
import type { CompiledForce } from '../../engine/forces/compile';
import { DEFAULT_PLOT_PARTICLES, type PlotParticles } from '../../engine/forces/resultant';
import { NumberField, Vec3Field, nonNegative, positive } from '../components/fields';
import { ResultantPotentialPlot } from './ForcePlot';

interface ResultantSettings {
  particles: PlotParticles;
  /** Right edges of the short- and long-range plots; 0 = automatic. */
  shortDistance: number;
  longDistance: number;
}

const DEFAULTS: ResultantSettings = { particles: DEFAULT_PLOT_PARTICLES, shortDistance: 0, longDistance: 0 };
const STORAGE_KEY = 'resultant-plot';

// Remembered for the browser session like the cards' expansion; a malformed entry falls back to defaults.
function read(): ResultantSettings {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as ResultantSettings | null;
    return saved && saved.particles?.i && saved.particles?.j ? { ...DEFAULTS, ...saved } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function write(settings: ResultantSettings): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage blocked (private mode, sandbox): the settings still apply to this view.
  }
}

function ParticleFields({ side, particle, onChange }: { side: 'i' | 'j'; particle: FieldProbe; onChange: (p: FieldProbe) => void }) {
  const set = (patch: Partial<FieldProbe>) => onChange({ ...particle, ...patch });
  return (
    <div className="grid">
      <NumberField label={`Mass ${side}`} value={particle.mass} validate={positive} onCommit={(mass) => set({ mass })} />
      <NumberField label={`Charge ${side}`} value={particle.charge} onCommit={(charge) => set({ charge })} />
      <NumberField label={`Charge 2 ${side}`} value={particle.charge2} onCommit={(charge2) => set({ charge2 })} />
      <Vec3Field label={`Spin ${side}`} value={particle.spin} onCommit={(spin) => set({ spin })} />
      <NumberField label={`Isospin ${side}`} value={particle.isospin} onCommit={(isospin) => set({ isospin })} />
      <NumberField label={`Parity ${side}`} value={particle.parity} onCommit={(parity) => set({ parity })} />
      <NumberField label={`Nuclear ${side}`} value={particle.nuclearCharge} onCommit={(nuclearCharge) => set({ nuclearCharge })} />
      <Vec3Field label={`Color ${side}`} axes={['r', 'g', 'b']} value={particle.color} onCommit={(color) => set({ color })} />
    </div>
  );
}

/** Resultant potential plots with their own sample pair and distance range. */
export function ResultantView({ forces }: { forces: readonly CompiledForce[] }) {
  const [settings, setSettings] = useState(read);
  const update = (patch: Partial<ResultantSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    write(next);
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
        <ParticleFields side="i" particle={settings.particles.i} onChange={(i) => update({ particles: { ...settings.particles, i } })} />
        <h4 className="section-title">Particle j (exerts it)</h4>
        <ParticleFields side="j" particle={settings.particles.j} onChange={(j) => update({ particles: { ...settings.particles, j } })} />
        <button className="outlined" onClick={() => update(DEFAULTS)}>Restore defaults</button>
      </details>
    </div>
  );
}
