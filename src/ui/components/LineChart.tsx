import { useState, type PointerEvent } from 'react';

export interface Series {
  label: string;
  /** CSS color, normally one of the --series-N tokens. */
  color: string;
  values: readonly number[];
}

interface Props {
  title: string;
  x: readonly number[];
  xLabel: string;
  series: readonly Series[];
  /** Start the y axis at zero (for quantities that cannot be negative). */
  zeroBased?: boolean;
  note?: string;
}

const WIDTH = 400;
const HEIGHT = 120;
const PAD = { left: 52, right: 8, top: 6, bottom: 16 };

export function formatValue(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return '0';
  const magnitude = Math.abs(value);
  return magnitude >= 1e5 || magnitude < 1e-2 ? value.toExponential(2) : value.toPrecision(4);
}

export function LineChart({ title, x, xLabel, series, zeroBased = false, note }: Props) {
  const [hover, setHover] = useState<number>();
  const count = x.length;
  const values = series.flatMap((s) => s.values.filter(Number.isFinite));

  if (count < 2 || values.length === 0) {
    return (
      <figure className="chart">
        <figcaption className="chart-title">{title}</figcaption>
        <p className="muted">Collecting samples (one per second while the simulation runs)…</p>
      </figure>
    );
  }

  let lo = zeroBased ? Math.min(0, ...values) : Math.min(...values);
  let hi = Math.max(...values);
  if (hi === lo) [lo, hi] = [lo - 1, hi + 1];
  const padding = (hi - lo) * 0.05;
  if (!(zeroBased && lo === 0)) lo -= padding;
  hi += padding;
  const x0 = x[0]!;
  const x1 = x[count - 1]!;
  const px = (k: number) => PAD.left + ((x[k]! - x0) / (x1 - x0 || 1)) * (WIDTH - PAD.left - PAD.right);
  const py = (v: number) => PAD.top + ((hi - v) / (hi - lo)) * (HEIGHT - PAD.top - PAD.bottom);
  // Non-finite samples break the line: the next finite point starts a new subpath.
  const path = (s: Series) => {
    let pen = 'M';
    return s.values.map((v, k) => {
      if (!Number.isFinite(v)) {
        pen = 'M';
        return '';
      }
      const segment = `${pen}${px(k).toFixed(1)},${py(v).toFixed(1)}`;
      pen = 'L';
      return segment;
    }).join('');
  };
  const ticks = [hi - padding, (hi + lo) / 2, zeroBased && lo === 0 ? 0 : lo + padding];

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const chartX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    for (let k = 1; k < count; k++) if (Math.abs(px(k) - chartX) < Math.abs(px(nearest) - chartX)) nearest = k;
    setHover(nearest);
  };
  const hovered = hover !== undefined && hover < count ? hover : undefined;
  const at = hovered ?? count - 1;

  return (
    <figure className="chart">
      <figcaption className="chart-title">{title}</figcaption>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.label}>
            {series.length > 1 && <i style={{ background: s.color }} />}
            {s.label} <b className="mono">{formatValue(s.values[at]!)}</b>
          </span>
        ))}
        <span className="muted mono">{xLabel} {formatValue(x[at]!)}</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={title} onPointerMove={onMove} onPointerLeave={() => setHover(undefined)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={py(t)} y2={py(t)} stroke="var(--plot-grid)" />
            <text x={PAD.left - 4} y={py(t) + 3} textAnchor="end">{formatValue(t)}</text>
          </g>
        ))}
        <text x={PAD.left} y={HEIGHT - 3}>{formatValue(x0)}</text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 3} textAnchor="end">{formatValue(x1)}</text>
        {series.map((s) => (
          <path key={s.label} d={path(s)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
        ))}
        {hovered !== undefined && (
          <g>
            <line x1={px(hovered)} x2={px(hovered)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="var(--ink-3)" strokeDasharray="2 2" />
            {series.map((s) => Number.isFinite(s.values[hovered]) && (
              <circle key={s.label} cx={px(hovered)} cy={py(s.values[hovered]!)} r={4} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      {note && <p className="chart-note">{note}</p>}
    </figure>
  );
}
