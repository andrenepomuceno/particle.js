import { useState, type KeyboardEvent } from 'react';
import { FORCE_PRESETS, newForceId, type ForcePresetId } from '../../engine/forces/presets';
import type { ForceDefinition, ForceParam } from '../../engine/forces/types';
import { CheckField, NumberField, SelectField, useValidators } from '../components/fields';
import { useAppState, useController, useMessages } from '../context';
import { loadJson, saveJson } from '../persist';
import { FORCES_EXPANDED_KEY } from '../storageKeys';
import { ForcePlot } from './ForcePlot';
import { ResultantView } from './ResultantView';

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
  const { forces: t } = useMessages();
  return (
    <>
      <TextCommit label={t.parameterName} value={param.name} onCommit={(name) => onChange({ ...param, name })} />
      <NumberField inline label={t.parameterValue(param.name)} value={param.value} onCommit={(value) => onChange({ ...param, value })} />
      <button className="danger" aria-label={t.removeParameter(param.name)} onClick={onRemove}>✕</button>
    </>
  );
}

function ForceCard({ force, errors, warnings, collapsed, onToggle }: {
  force: ForceDefinition; errors: string[] | undefined; warnings: string[] | undefined;
  collapsed: boolean; onToggle: () => void;
}) {
  const controller = useController();
  const { forces: t, options } = useMessages();
  const { positive, nonNegative } = useValidators();
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
        <button className="collapse" aria-expanded={!collapsed} aria-label={collapsed ? t.expand(force.name) : t.collapse(force.name)} onClick={onToggle}>
          {collapsed ? '▸' : '▾'}
        </button>
        <input type="checkbox" aria-label={t.enable(force.name)} checked={force.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
        <TextCommit label={t.forceName} value={force.name} onCommit={(name) => update({ name })} />
        <button title={t.duplicate} aria-label={t.duplicateForce(force.name)} onClick={() => controller.setForces([...controller.state.forces, { ...force, id: newForceId(), name: t.copyName(force.name) }])}>⧉</button>
        <button className="danger" title={t.remove} aria-label={t.removeForce(force.name)} onClick={() => controller.removeForce(force.id)}>✕</button>
      </header>
      {collapsed ? (
        <p className="force-summary mono" title={force.expression}>
          {errors && <span className="badge error">{t.error}</span>}
          {warnings && <span className="badge warning">{t.warning}</span>}
          {force.mode === 'potential' ? 'V' : 'F'} = {force.expression}
          <span className="muted"> · {options.forceRange[force.range]}{force.range === 'short' ? ` < ${force.cutoff}` : ''}</span>
        </p>
      ) : (
      <>
      <div className="grid">
        {/* Potentials cannot be retarded, and the checkbox to undo it only shows in force mode. */}
        <SelectField label={t.mode} value={force.mode} options={['force', 'potential'] as const} optionLabel={(m) => options.forceMode[m]} onChange={(mode) => update(mode === 'potential' ? { mode, retarded: false } : { mode })} />
        <SelectField label={t.range} value={force.range} options={['long', 'short'] as const} optionLabel={(r) => options.forceRange[r]} onChange={(range) => update({ range })} />
        {force.range === 'short' && <NumberField label={t.cutoff} value={force.cutoff} validate={positive} onCommit={(cutoff) => update({ cutoff })} />}
        <NumberField label={t.softening} value={force.softening} validate={nonNegative} onCommit={(softening) => update({ softening })} />
        {force.mode === 'force' && (
          <CheckField label={t.retarded} checked={force.retarded === true} onChange={(retarded) => update({ retarded })} />
        )}
        <label>{force.mode === 'potential' ? 'V(r) =' : 'F(r) ='}</label>
        <TextCommit label={t.expression} multiline value={force.expression} onCommit={(expression) => update({ expression })} />
      </div>
      <div className="params">
        {force.params.map((param, index) => (
          <ParamRow key={index} param={param} onChange={(p) => setParam(index, p)}
            onRemove={() => update({ params: force.params.filter((_, k) => k !== index) })} />
        ))}
      </div>
      <button className="outlined" style={{ marginTop: 4 }} onClick={addParam}>{t.addParameter}</button>
      {errors && <ul className="errors">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      {warnings && <ul className="warnings">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
      {!errors && <ForcePlot definition={force} />}
      </>
      )}
    </article>
  );
}

/** Key of the resultant section in the expanded set (force ids never take this form). */
const RESULTANT = 'resultant';

export function ForcesView({ onReference }: { onReference: () => void }) {
  const controller = useController();
  const { forces: t, forcePresets } = useMessages();
  const forces = useAppState((s) => s.forces);
  const forceErrors = useAppState((s) => s.forceErrors);
  const forceWarnings = useAppState((s) => s.forceWarnings);
  const shaderError = useAppState((s) => s.shaderError);
  const [preset, setPreset] = useState<ForcePresetId>('gravity');
  // Collapsed by default; what the user expands is remembered for the session by force id, so a
  // rename keeps a card open and same-named forces stay independent (a reloaded scenario has new ids).
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(loadJson<string[]>(FORCES_EXPANDED_KEY, [], 'session')));
  const update = (next: ReadonlySet<string>) => {
    setExpanded(next);
    saveJson(FORCES_EXPANDED_KEY, [...next], 'session');
  };
  const active = useAppState((s) => s.compiledForces);
  const toggle = (key: string) => {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    update(next);
  };

  return (
    <div className="stack">
      {shaderError && <pre className="errors">{shaderError}</pre>}
      {forces.length === 0 && <p className="muted">{t.none}</p>}
      {forces.length > 1 && (
        <div className="row">
          <button className="outlined" onClick={() => update(new Set([...expanded].filter((n) => n === RESULTANT)))}>{t.collapseAll}</button>
          <button className="outlined" onClick={() => update(new Set([...expanded, ...forces.map((f) => f.id)]))}>{t.expandAll}</button>
        </div>
      )}
      {active.length > 0 && (
        <details className="resultant" open={expanded.has(RESULTANT)}
          onToggle={(e) => {
            if (e.currentTarget.open !== expanded.has(RESULTANT)) toggle(RESULTANT);
          }}>
          <summary className="section-title">{t.resultant}</summary>
          <ResultantView forces={active} />
        </details>
      )}
      {forces.map((force) => (
        <ForceCard key={force.id} force={force} errors={forceErrors[force.id]} warnings={forceWarnings[force.id]}
          collapsed={!expanded.has(force.id)} onToggle={() => toggle(force.id)} />
      ))}
      <div className="row">
        <select aria-label={t.preset} value={preset} onChange={(e) => setPreset(e.target.value as ForcePresetId)} style={{ flex: 1 }}>
          {(Object.keys(FORCE_PRESETS) as ForcePresetId[]).map((id) => <option key={id} value={id}>{forcePresets[id]}</option>)}
        </select>
        <button className="primary" onClick={() => controller.addForce(preset)}>{t.add}</button>
        <button className="outlined" onClick={onReference}>{t.reference}</button>
      </div>
      <button className="outlined" onClick={() => controller.restoreForces()}>{t.restore}</button>
    </div>
  );
}
