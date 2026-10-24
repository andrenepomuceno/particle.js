import { useMemo, useState, type PointerEvent } from 'react';
import { compileForce, forceScope, type CompiledForce, type PairScope } from '../../engine/forces/compile';
import type { ForceDefinition } from '../../engine/forces/types';

const WIDTH = 400;
const HEIGHT = 120;
const PAD = { left: 44, right: 8, top: 8, bottom: 16 };
const SAMPLES = 240;
const SYMLOG_RATIO = 1e3;

export const PLOT_PAIR: Omit<PairScope, 'r'> = {
  m_i: 1, m_j: 1, q_i: 1, q_j: 1, s_i: 0.5, s_j: 0.5, p_i: 1, p_j: 1, n_i: 1, n_j: 1,
  cr_i: 1, cg_i: 0, cb_i: 0, cr_j: -1, cg_j: 0, cb_j: 0, t_i: 0, t_j: 0, time: 0,
};

/** What the integrator applies at true distance d: softening, then the hard cutoff. */
export function appliedForce(force: CompiledForce, distance: number): number {
  const { range, cutoff, softening } = force.definition;
  if (range === 'short' && !(distance < cutoff)) return 0;
  return force.evaluate(forceScope(force, { ...PLOT_PAIR, r: Math.sqrt(distance ** 2 + softening ** 2) }));
}

function formatNumber(value: number): string {
  if (value === 0) return '0';
  const magnitude = Math.abs(value);
  return magnitude >= 1e4 || magnitude < 1e-2 ? value.toExponential(1) : value.toPrecision(3);
}

export function ForcePlot({ definition }: { definition: ForceDefinition }) {
  const [hover, setHover] = useState<number>();
  const plot = useMemo(() => {
    let force: CompiledForce;
    try {
      force = compileForce(definition);
    } catch {
      return undefined;
    }
    const maxDistance = definition.range === 'short' ? definition.cutoff * 1.2 : Math.max(definition.softening * 20, 100);
    const points = Array.from({ length: SAMPLES }, (_, k) => {
      const d = (maxDistance * (k + 1)) / SAMPLES;
      return { d, f: appliedForce(force, d) };
    });
    const finite = points.map((p) => p.f).filter(Number.isFinite);
    const magnitudes = finite.map(Math.abs).filter((m) => m > 0).sort((a, b) => a - b);
    const median = magnitudes[Math.floor(magnitudes.length / 2)] ?? 1;
    const symlog = magnitudes.length > 0 && magnitudes[magnitudes.length - 1]! / median > SYMLOG_RATIO;
    const scale = (f: number) => (symlog ? Math.sign(f) * Math.log10(1 + Math.abs(f) / median) : f);
    let lo = Math.min(0, ...finite);
    let hi = Math.max(0, ...finite);
    if (hi - lo === 0) [lo, hi] = [-1, 1];
    const [sLo, sHi] = [scale(lo), scale(hi)];
    const x = (d: number) => PAD.left + (d / maxDistance) * (WIDTH - PAD.left - PAD.right);
    const y = (f: number) => PAD.top + ((sHi - scale(f)) / (sHi - sLo)) * (HEIGHT - PAD.top - PAD.bottom);
    const path = points
      .filter((p) => Number.isFinite(p.f))
      .map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.d).toFixed(1)},${y(p.f).toFixed(1)}`)
      .join('');
    const nonFinite = points.some((p) => !Number.isFinite(p.f));
    return { points, path, x, y, lo, hi, maxDistance, nonFinite, symlog };
  }, [definition]);

  if (!plot) return null;

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const index = Math.round(((fraction - PAD.left) / (WIDTH - PAD.left - PAD.right)) * SAMPLES) - 1;
    setHover(index >= 0 && index < SAMPLES ? index : undefined);
  };
  const hovered = hover === undefined ? undefined : plot.points[hover];

  return (
    <figure className="plot" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`F(d) for ${definition.name}`} onPointerMove={onMove} onPointerLeave={() => setHover(undefined)}>
        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={plot.y(0)} y2={plot.y(0)} stroke="var(--ink-3)" strokeWidth={1} />
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="var(--plot-grid)" />
        <text x={PAD.left - 4} y={PAD.top + 8} textAnchor="end">{formatNumber(plot.hi)}</text>
        <text x={PAD.left - 4} y={HEIGHT - PAD.bottom} textAnchor="end">{formatNumber(plot.lo)}</text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 3} textAnchor="end">d = {formatNumber(plot.maxDistance)}</text>
        <text x={PAD.left} y={HEIGHT - 3}>0{plot.symlog ? '  (symlog y)' : ''}</text>
        <path d={plot.path} fill="none" stroke="var(--plot-line)" strokeWidth={2} strokeLinejoin="round" />
        {hovered && Number.isFinite(hovered.f) && (
          <g>
            <line x1={plot.x(hovered.d)} x2={plot.x(hovered.d)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="var(--ink-3)" strokeDasharray="2 2" />
            <circle cx={plot.x(hovered.d)} cy={plot.y(hovered.f)} r={4} fill="var(--plot-line)" stroke="var(--surface-1)" strokeWidth={2} />
            <text className="tooltip" x={WIDTH - PAD.right} y={PAD.top + 8} textAnchor="end">
              d={formatNumber(hovered.d)} F={formatNumber(hovered.f)}
            </text>
          </g>
        )}
      </svg>
      <figcaption className="muted">
        F &gt; 0 repels. Sample pair: m=1, q=+1/+1, s=½/½, p=+1/+1, color red/anti-red.
        {plot.nonFinite && <span style={{ color: 'var(--danger)' }}> Non-finite values in range (check softening).</span>}
      </figcaption>
    </figure>
  );
}
