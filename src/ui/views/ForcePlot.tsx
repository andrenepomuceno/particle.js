import { useMemo, useState, type PointerEvent, type ReactNode } from 'react';
import { compileForce, type CompiledForce } from '../../engine/forces/compile';
import { appliedForce, plotDistance, resultantPotential, type PlotParticles, plotPair } from '../../engine/forces/resultant';
import type { ForceDefinition, ForceRange } from '../../engine/forces/types';

const WIDTH = 400;
const HEIGHT = 120;
const PAD = { left: 44, right: 8, top: 8, bottom: 16 };
const SAMPLES = 240;
const SYMLOG_RATIO = 1e3;

const SAMPLE_PAIR = 'Sample pair: m=1, q=+1/+1, spin ½ẑ each (r̂ along x), I3=+½, p=+1/+1, color red/anti-red.';

function formatNumber(value: number): string {
  if (value === 0) return '0';
  const magnitude = Math.abs(value);
  return magnitude >= 1e4 || magnitude < 1e-2 ? value.toExponential(1) : value.toPrecision(3);
}

/** One curve y(d) over [0, maxDistance] with a zero line, symlog y when it spans many decades, and hover. */
function CurvePlot({ points, maxDistance, symbol, label, caption }: {
  points: readonly { d: number; y: number }[]; maxDistance: number; symbol: string; label: string; caption: ReactNode;
}) {
  const [hover, setHover] = useState<number>();
  const plot = useMemo(() => {
    const finite = points.map((p) => p.y).filter(Number.isFinite);
    const magnitudes = finite.map(Math.abs).filter((m) => m > 0).sort((a, b) => a - b);
    const median = magnitudes[Math.floor(magnitudes.length / 2)] ?? 1;
    const symlog = magnitudes.length > 0 && magnitudes[magnitudes.length - 1]! / median > SYMLOG_RATIO;
    const scale = (y: number) => (symlog ? Math.sign(y) * Math.log10(1 + Math.abs(y) / median) : y);
    let lo = Math.min(0, ...finite);
    let hi = Math.max(0, ...finite);
    if (hi - lo === 0) [lo, hi] = [-1, 1];
    const [sLo, sHi] = [scale(lo), scale(hi)];
    const x = (d: number) => PAD.left + (d / maxDistance) * (WIDTH - PAD.left - PAD.right);
    const y = (v: number) => PAD.top + ((sHi - scale(v)) / (sHi - sLo)) * (HEIGHT - PAD.top - PAD.bottom);
    const path = points
      .filter((p) => Number.isFinite(p.y))
      .map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.d).toFixed(1)},${y(p.y).toFixed(1)}`)
      .join('');
    return { path, x, y, lo, hi, symlog, nonFinite: points.some((p) => !Number.isFinite(p.y)) };
  }, [points, maxDistance]);

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const index = Math.round(((fraction - PAD.left) / (WIDTH - PAD.left - PAD.right)) * points.length) - 1;
    setHover(index >= 0 && index < points.length ? index : undefined);
  };
  const hovered = hover === undefined ? undefined : points[hover];

  return (
    <figure className="plot" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} onPointerMove={onMove} onPointerLeave={() => setHover(undefined)}>
        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={plot.y(0)} y2={plot.y(0)} stroke="var(--ink-3)" strokeWidth={1} />
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="var(--plot-grid)" />
        <text x={PAD.left - 4} y={PAD.top + 8} textAnchor="end">{formatNumber(plot.hi)}</text>
        <text x={PAD.left - 4} y={HEIGHT - PAD.bottom} textAnchor="end">{formatNumber(plot.lo)}</text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 3} textAnchor="end">d = {formatNumber(maxDistance)}</text>
        <text x={PAD.left} y={HEIGHT - 3}>0{plot.symlog ? '  (symlog y)' : ''}</text>
        <path d={plot.path} fill="none" stroke="var(--plot-line)" strokeWidth={2} strokeLinejoin="round" />
        {hovered && Number.isFinite(hovered.y) && (
          <g>
            <line x1={plot.x(hovered.d)} x2={plot.x(hovered.d)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="var(--ink-3)" strokeDasharray="2 2" />
            <circle cx={plot.x(hovered.d)} cy={plot.y(hovered.y)} r={4} fill="var(--plot-line)" stroke="var(--surface-1)" strokeWidth={2} />
            <text className="tooltip" x={WIDTH - PAD.right} y={PAD.top + 8} textAnchor="end">
              d={formatNumber(hovered.d)} {symbol}={formatNumber(hovered.y)}
            </text>
          </g>
        )}
      </svg>
      <figcaption className="muted">
        {caption}
        {plot.nonFinite && <span style={{ color: 'var(--danger)' }}> Non-finite values in range (check softening).</span>}
      </figcaption>
    </figure>
  );
}

/** F(d) of one force as the integrator applies it. */
export function ForcePlot({ definition }: { definition: ForceDefinition }) {
  const curve = useMemo(() => {
    let force: CompiledForce;
    try {
      force = compileForce(definition);
    } catch {
      return undefined;
    }
    const maxDistance = plotDistance(force);
    const points = Array.from({ length: SAMPLES }, (_, k) => {
      const d = (maxDistance * (k + 1)) / SAMPLES;
      return { d, y: appliedForce(force, d) };
    });
    return { points, maxDistance, vector: force.vector };
  }, [definition]);
  if (!curve) return null;
  return (
    <CurvePlot points={curve.points} maxDistance={curve.maxDistance} symbol="F" label={`F(d) for ${definition.name}`} caption={<>
      F &gt; 0 repels. {SAMPLE_PAIR}
      {curve.vector && ' Vector force: the curve is its radial part for this orientation only; it also has a transverse part and changes with the spins’ angle to r̂.'}
    </>} />
  );
}

/** Σ V(d) of the enabled forces of one range: the landscape a pair actually moves in. */
export function ResultantPotentialPlot({ forces, range, particles, maxDistance }: {
  forces: readonly CompiledForce[]; range: ForceRange; particles: PlotParticles; maxDistance: number | undefined;
}) {
  const curve = useMemo(() => {
    const result = resultantPotential(forces, range, { pair: plotPair(particles), maxDistance, samples: SAMPLES });
    return result && { ...result, points: result.points.map((p) => ({ d: p.d, y: p.v })) };
  }, [forces, range, particles, maxDistance]);
  if (!curve) return null;
  const title = range === 'short' ? 'Short range' : 'Long range';
  return (
    <CurvePlot points={curve.points} maxDistance={curve.maxDistance} symbol="V"
      label={`${title} resultant potential`} caption={<>
        <b>{title}</b>: Σ V(d) of the enabled {range}-range forces for the pair below (r̂ along x, from j to i).
        {curve.integrated.length > 0 && ` Integrated from the applied F (force mode, or softened): ${curve.integrated.join(', ')}.`}
      </>} />
  );
}
