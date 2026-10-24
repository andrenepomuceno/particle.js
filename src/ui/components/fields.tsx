import { useState, type KeyboardEvent } from 'react';

interface NumberFieldProps {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  validate?: (value: number) => string | undefined;
  inline?: boolean;
}

/** Commits on blur or Enter; an invalid entry stays visible and flagged instead of being replaced. */
export function NumberField({ label, value, onCommit, validate, inline = false }: NumberFieldProps) {
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
    const problem = Number.isFinite(parsed) ? validate?.(parsed) : `'${text}' is not a number`;
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
}

export function SelectField<T extends string>({ label, value, options, onChange }: SelectFieldProps<T>) {
  return (
    <>
      <label>{label}</label>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
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

export const positive = (v: number) => (v > 0 ? undefined : 'must be > 0');
export const nonNegative = (v: number) => (v >= 0 ? undefined : 'must be >= 0');
export const integerAtLeast = (min: number) => (v: number) =>
  Number.isInteger(v) && v >= min ? undefined : `must be an integer >= ${min}`;

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
