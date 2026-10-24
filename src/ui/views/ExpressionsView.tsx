import { Fragment } from 'react';
import { FUNCTION_ARITY, VECTOR_FUNCTIONS } from '../../engine/expr/ast';
import { PAIR_VARIABLES, type PairVariable } from '../../engine/forces/variables';

const GROUPS: readonly [title: string, bases: readonly string[]][] = [
  ['Geometry', ['r', 'x', 'cutoff', 'dx', 'dy', 'dz', 'd', 'rhat']],
  ['Mass and charge', ['m', 'q', 'q2', 'q_dot']],
  ['Spin and isospin', ['sx', 'sy', 'sz', 's', 's_dot', 'si_r', 'sj_r', 'i3']],
  ['Color charge', ['cr', 'cg', 'cb', 'cx', 'cy', 'c_dot']],
  ['Nuclear charge and parity', ['n', 'p']],
  ['Velocity', ['vx', 'vy', 'vz', 'v', 'v_dot', 'v_rel', 'vv_dot']],
  ['Time', ['t', 'time']],
];

/** Collapses each per-particle pair (m_i, m_j) into one row keyed by its base name (m). */
function rows(): Map<string, { names: string[]; variable: PairVariable }> {
  const byBase = new Map<string, { names: string[]; variable: PairVariable }>();
  for (const variable of PAIR_VARIABLES) {
    const base = /^(.*)_[ij]$/.exec(variable.name)?.[1] ?? variable.name;
    const row = byBase.get(base);
    if (row) row.names.push(variable.name);
    else byBase.set(base, { names: [variable.name], variable });
  }
  return byBase;
}

const describe = (variable: PairVariable, paired: boolean) =>
  (paired ? variable.description.replace(/ of the particle receiving the force$/, '') : variable.description)
  + (variable.shortRangeOnly ? ' (short range only)' : '');

export function ExpressionsView() {
  const byBase = rows();
  const grouped = new Set(GROUPS.flatMap(([, bases]) => bases));
  const ungrouped = [...byBase.keys()].filter((base) => !grouped.has(base));
  if (ungrouped.length > 0) throw new Error(`variables missing from the reference groups: ${ungrouped.join(', ')}`);

  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>
        A force is a signed magnitude along the line between the pair: <b>F &gt; 0 pushes them apart</b>.
        In potential mode you write V(r) and the engine uses F = −dV/dr, derived exactly. <kbd>Ctrl</kbd>+<kbd>Enter</kbd> applies an expression.
        Suffix <span className="mono">_i</span> is the particle receiving the force, <span className="mono">_j</span> the one exerting it.
      </p>
      {GROUPS.map(([title, bases]) => (
        <section key={title}>
          <h3 className="section-title">{title}</h3>
          <dl className="reference">
            {bases.map((base) => {
              const row = byBase.get(base);
              if (!row) return null;
              return (
                <Fragment key={base}>
                  <dt className="mono">{row.names.join(', ')}</dt>
                  <dd>{describe(row.variable, row.names.length > 1)}</dd>
                </Fragment>
              );
            })}
          </dl>
        </section>
      ))}
      <section>
        <h3 className="section-title">Functions and operators</h3>
        <p className="mono" style={{ margin: 0 }}>{Object.entries(FUNCTION_ARITY).map(([name, arity]) => `${name}(${'·'.repeat(arity).split('').join(', ')})`).join('  ')}</p>
        <p className="mono" style={{ margin: '4px 0 0' }}>{Object.entries(VECTOR_FUNCTIONS).map(([name, arity]) => `${name}(${'·'.repeat(arity).split('').join(', ')})`).join('  ')}</p>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          Vectors (d, rhat, s_i, s_j, v_i, v_j, vec(·, ·, ·)) combine with + − between vectors, × and ÷ by numbers,
          cross, dot, length and normalize. In force mode a vector result is applied as the force itself (e.g.
          q_i * cross(v_i, B)); a force that reads v_i is stepped with an implicit velocity update that keeps v × B rotations exact.
        </p>
        <p className="mono" style={{ margin: '4px 0 0' }}>+ - * / ^ (or **) · constants pi, e · any other name must be a parameter of the force</p>
      </section>
      <section>
        <h3 className="section-title">Range and softening</h3>
        <p className="muted" style={{ margin: 0 }}>
          Short-range forces act only below their cutoff (x = r / cutoff). Softening ε replaces r with √(r² + ε²)
          inside the expression; the direction still uses the true distance. A potential that reads dx, dy, dz,
          si_r or sj_r is a vector potential: its force is the full gradient −∇V (non-central), not a magnitude along r̂.
        </p>
      </section>
    </div>
  );
}
