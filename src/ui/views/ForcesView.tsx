import { Fragment, useState, type KeyboardEvent } from 'react';
import { FUNCTION_ARITY } from '../../engine/expr/ast';
import { FORCE_PRESETS, newForceId, type ForcePresetId } from '../../engine/forces/presets';
import type { ForceDefinition, ForceParam } from '../../engine/forces/types';
import { PAIR_VARIABLES } from '../../engine/forces/variables';
import { NumberField, SelectField, nonNegative, positive } from '../components/fields';
import { useAppState, useController } from '../context';
import { ForcePlot } from './ForcePlot';

function TextCommit({ value, onCommit, label, multiline = false }: {
  value: string; onCommit: (value: string) => void; label: string; multiline?: boolean;
}) {
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setText(value);
  }
  const commit = () => text !== value && onCommit(text);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && (!multiline || event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      commit();
    }
  };
  const common = { 'aria-label': label, value: text, onBlur: commit, onKeyDown, spellCheck: false };
  return multiline
    ? <textarea {...common} rows={2} onChange={(event) => setText(event.target.value)} />
    : <input type="text" {...common} onChange={(event) => setText(event.target.value)} />;
}

function ParamRow({ param, onChange, onRemove }: {
  param: ForceParam; onChange: (param: ForceParam) => void; onRemove: () => void;
}) {
  return (
    <>
      <TextCommit label="parameter name" value={param.name} onCommit={(name) => onChange({ ...param, name })} />
      <NumberField inline label={`value of ${param.name}`} value={param.value} onCommit={(value) => onChange({ ...param, value })} />
      <button className="danger" aria-label={`Remove parameter ${param.name}`} onClick={onRemove}>✕</button>
    </>
  );
}

function ForceCard({ force, errors, warnings }: { force: ForceDefinition; errors: string[] | undefined; warnings: string[] | undefined }) {
  const controller = useController();
  const update = (patch: Partial<ForceDefinition>) => controller.updateForce(force.id, patch);
  const setParam = (index: number, param: ForceParam) =>
    update({ params: force.params.map((p, k) => (k === index ? param : p)) });
  const addParam = () => {
    const taken = new Set(force.params.map((p) => p.name));
    const name = ['a', 'b', 'c', 'd', 'k1', 'k2', 'k3'].find((n) => !taken.has(n)) ?? `k${force.params.length}`;
    update({ params: [...force.params, { name, value: 1 }] });
  };

  return (
    <article className={force.enabled ? 'force-card' : 'force-card disabled'} data-force={force.name}>
      <header>
        <input type="checkbox" aria-label={`Enable ${force.name}`} checked={force.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
        <TextCommit label="force name" value={force.name} onCommit={(name) => update({ name })} />
        <button title="Duplicate" aria-label={`Duplicate ${force.name}`} onClick={() => controller.setForces([...controller.state.forces, { ...force, id: newForceId(), name: `${force.name} copy` }])}>⧉</button>
        <button className="danger" title="Remove" aria-label={`Remove ${force.name}`} onClick={() => controller.removeForce(force.id)}>✕</button>
      </header>
      <div className="grid">
        <SelectField label="Mode" value={force.mode} options={['force', 'potential'] as const} onChange={(mode) => update({ mode })} />
        <SelectField label="Range" value={force.range} options={['long', 'short'] as const} onChange={(range) => update({ range })} />
        {force.range === 'short' && <NumberField label="Cutoff" value={force.cutoff} validate={positive} onCommit={(cutoff) => update({ cutoff })} />}
        <NumberField label="Softening" value={force.softening} validate={nonNegative} onCommit={(softening) => update({ softening })} />
        <label>{force.mode === 'potential' ? 'V(r) =' : 'F(r) ='}</label>
        <TextCommit label="expression" multiline value={force.expression} onCommit={(expression) => update({ expression })} />
      </div>
      <div className="params">
        {force.params.map((param, index) => (
          <ParamRow key={index} param={param} onChange={(p) => setParam(index, p)}
            onRemove={() => update({ params: force.params.filter((_, k) => k !== index) })} />
        ))}
      </div>
      <button className="outlined" style={{ marginTop: 4 }} onClick={addParam}>+ parameter</button>
      {errors && <ul className="errors">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      {warnings && <ul className="warnings">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
      {!errors && <ForcePlot definition={force} />}
    </article>
  );
}

export function ForcesView() {
  const controller = useController();
  const forces = useAppState((s) => s.forces);
  const forceErrors = useAppState((s) => s.forceErrors);
  const forceWarnings = useAppState((s) => s.forceWarnings);
  const shaderError = useAppState((s) => s.shaderError);
  const [preset, setPreset] = useState<ForcePresetId>('gravity');

  return (
    <div className="stack">
      {shaderError && <pre className="errors">{shaderError}</pre>}
      {forces.length === 0 && <p className="muted">No forces: particles move freely.</p>}
      {forces.map((force) => <ForceCard key={force.id} force={force} errors={forceErrors[force.id]} warnings={forceWarnings[force.id]} />)}
      <div className="row">
        <select aria-label="Force preset" value={preset} onChange={(e) => setPreset(e.target.value as ForcePresetId)} style={{ flex: 1 }}>
          {Object.entries(FORCE_PRESETS).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}
        </select>
        <button className="primary" onClick={() => controller.addForce(preset)}>Add force</button>
      </div>
      <details>
        <summary className="muted">Expression reference</summary>
        <p className="muted">Positive F pushes the pair apart. In potential mode F = −dV/dr is derived symbolically. Ctrl+Enter applies the expression.</p>
        <dl className="stats">
          {PAIR_VARIABLES.map((v) => (
            <Fragment key={v.name}>
              <dt className="mono">{v.name}</dt>
              <dd style={{ textAlign: 'left', fontFamily: 'inherit' }}>{v.description}{v.shortRangeOnly ? ' (short range)' : ''}</dd>
            </Fragment>
          ))}
        </dl>
        <p className="muted mono">{Object.keys(FUNCTION_ARITY).join(' ')} · pi e · + - * / ^</p>
      </details>
    </div>
  );
}
