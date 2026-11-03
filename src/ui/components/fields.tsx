import { useMemo, useState, type KeyboardEvent } from 'react';
import { useMessages } from '../context';

interface NumberFieldProps {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  validate?: (value: number) => string | undefined;
  inline?: boolean;
}

/** Commits on blur or Enter; an invalid entry stays visible and flagged instead of being replaced. */
export function NumberField({ label, value, onCommit, validate, inline = false }: NumberFieldProps) {
  const t = useMessages();
  const [text, setText] = useState(String(value));
  const [error, setError] = useState<string>();
  const [synced, setSynced] = useState(value);
  if (!Object.is(synced, value)) {
    setSynced(value);
    setText(String(value));
    setError(undefined);
  }

  const commit = () => {
    const parsed = text.trim() === '' ? NaN : Number(text);
    const problem = Number.isFinite(parsed) ? validate?.(parsed) : t.validation.notANumber(text);
    setError(problem);
    if (problem === undefined && parsed !== value) {
      try {
        onCommit(parsed);
      } catch (failure) {
        setError((failure as Error).message);
      }
    }
  };

  return (
    <>
      {!inline && <label>{label}</label>}
      <input
        aria-label={label}
        className={error ? 'invalid mono' : 'mono'}
        title={error}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event: KeyboardEvent) => event.key === 'Enter' && commit()}
      />
    </>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  /** The text shown for an option (its value by default); the value is what onChange receives. */
  optionLabel?: (value: T) => string;
}

export function SelectField<T extends string>({ label, value, options, onChange, optionLabel = (option) => option }: SelectFieldProps<T>) {
  return (
    <>
      <label>{label}</label>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => <option key={option} value={option}>{optionLabel(option)}</option>)}
      </select>
    </>
  );
}

interface CheckFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function CheckField({ label, checked, onChange }: CheckFieldProps) {
  return (
    <>
      <label>{label}</label>
      <input aria-label={label} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </>
  );
}

type Validator = (value: number) => string | undefined;

/** The common number checks, with their messages in the interface language. */
export function useValidators(): {
  positive: Validator; nonNegative: Validator; unitInterval: Validator;
  integerAtLeast: (min: number) => Validator; integerWithin: (min: number, max: number) => Validator;
} {
  const { validation: m } = useMessages();
  return useMemo(() => ({
    positive: (v) => (v > 0 ? undefined : m.positive),
    nonNegative: (v) => (v >= 0 ? undefined : m.nonNegative),
    unitInterval: (v) => (v >= 0 && v <= 1 ? undefined : m.unitInterval),
    integerAtLeast: (min) => (v) => (Number.isInteger(v) && v >= min ? undefined : m.integerAtLeast(min)),
    integerWithin: (min, max) => (v) => (Number.isInteger(v) && v >= min && v <= max ? undefined : m.integerWithin(min, max)),
  }), [m]);
}

interface Vec3FieldProps {
  label: string;
  value: readonly [number, number, number];
  onCommit: (value: [number, number, number]) => void;
  axes?: readonly [string, string, string];
}

/** Three inline number inputs on one grid row (spin, color charge). */
export function Vec3Field({ label, value, onCommit, axes = ['x', 'y', 'z'] }: Vec3FieldProps) {
  return (
    <>
      <label>{label}</label>
      <div className="vec3">
        {axes.map((axis, k) => (
          <NumberField key={axis} inline label={`${label} ${axis}`} value={value[k]!}
            onCommit={(v) => onCommit(value.map((c, j) => (j === k ? v : c)) as [number, number, number])} />
        ))}
      </div>
    </>
  );
}
