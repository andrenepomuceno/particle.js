import type { FieldProbe } from '../../engine/field';
import { useMessages } from '../context';
import { NumberField, Vec3Field, useValidators } from './fields';

/** Editor for a particle's attributes (the field's test particle, the resultant plot's pair). */
export function ProbeFields({ probe, onChange, suffix = '' }: { probe: FieldProbe; onChange: (probe: FieldProbe) => void; suffix?: string }) {
  const { attributes: a } = useMessages();
  const { positive } = useValidators();
  const set = (patch: Partial<FieldProbe>) => onChange({ ...probe, ...patch });
  const label = (name: string) => (suffix ? `${name} ${suffix}` : name);
  return (
    <div className="grid">
      <NumberField label={label(a.mass)} value={probe.mass} validate={positive} onCommit={(mass) => set({ mass })} />
      <NumberField label={label(a.charge)} value={probe.charge} onCommit={(charge) => set({ charge })} />
      <NumberField label={label(a.charge2)} value={probe.charge2} onCommit={(charge2) => set({ charge2 })} />
      <Vec3Field label={label(a.spin)} value={probe.spin} onCommit={(spin) => set({ spin })} />
      <NumberField label={label(a.isospin)} value={probe.isospin} onCommit={(isospin) => set({ isospin })} />
      <NumberField label={label(a.parity)} value={probe.parity} onCommit={(parity) => set({ parity })} />
      <NumberField label={label(a.nuclearCharge)} value={probe.nuclearCharge} onCommit={(nuclearCharge) => set({ nuclearCharge })} />
      <Vec3Field label={label(a.colorCharge)} axes={['r', 'g', 'b']} value={probe.color} onCommit={(color) => set({ color })} />
    </div>
  );
}
