import type { FieldProbe } from '../../engine/field';
import { NumberField, Vec3Field, positive } from './fields';

/** Editor for a particle's attributes (the field's test particle, the resultant plot's pair). */
export function ProbeFields({ probe, onChange, suffix = '' }: { probe: FieldProbe; onChange: (probe: FieldProbe) => void; suffix?: string }) {
  const set = (patch: Partial<FieldProbe>) => onChange({ ...probe, ...patch });
  const label = (name: string) => (suffix ? `${name} ${suffix}` : name);
  return (
    <div className="grid">
      <NumberField label={label('Mass')} value={probe.mass} validate={positive} onCommit={(mass) => set({ mass })} />
      <NumberField label={label('Charge')} value={probe.charge} onCommit={(charge) => set({ charge })} />
      <NumberField label={label('Charge 2')} value={probe.charge2} onCommit={(charge2) => set({ charge2 })} />
      <Vec3Field label={label('Spin')} value={probe.spin} onCommit={(spin) => set({ spin })} />
      <NumberField label={label('Isospin I3')} value={probe.isospin} onCommit={(isospin) => set({ isospin })} />
      <NumberField label={label('Parity')} value={probe.parity} onCommit={(parity) => set({ parity })} />
      <NumberField label={label('Nuclear charge')} value={probe.nuclearCharge} onCommit={(nuclearCharge) => set({ nuclearCharge })} />
      <Vec3Field label={label('Color charge')} axes={['r', 'g', 'b']} value={probe.color} onCommit={(color) => set({ color })} />
    </div>
  );
}
