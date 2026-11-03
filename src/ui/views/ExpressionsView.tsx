import { Fragment } from 'react';
import { FUNCTION_ARITY, VECTOR_FUNCTIONS } from '../../engine/expr/ast';
import { PAIR_VARIABLES, type PairVariable } from '../../engine/forces/variables';
import { variableTexts, type Messages } from '../../i18n';
import { Rich } from '../components/Rich';
import { useAppState, useMessages } from '../context';

type GroupId = keyof Messages['expressions']['groups'];

const GROUPS: readonly [group: GroupId, bases: readonly string[]][] = [
  ['geometry', ['r', 'x', 'cutoff', 'dx', 'dy', 'dz', 'd', 'rhat']],
  ['massCharge', ['m', 'q', 'q2', 'q_dot']],
  ['spin', ['sx', 'sy', 'sz', 's', 's_dot', 'si_r', 'sj_r', 'i3']],
  ['color', ['cr', 'cg', 'cb', 'cx', 'cy', 'c_dot']],
  ['nuclear', ['n', 'p']],
  ['velocity', ['vx', 'vy', 'vz', 'v', 'v_dot', 'v_rel', 'vv_dot']],
  ['time', ['t', 'time']],
  ['spacetime', ['c_light', 't_ret', 'ax', 'ay', 'az', 'a']],
  ['random', ['rand', 'randn', 'randv']],
];

/** Collapses each per-particle pair (m_i, m_j) into one row keyed by its base name (m). */
export function rows(): Map<string, { names: string[]; variable: PairVariable }> {
  const byBase = new Map<string, { names: string[]; variable: PairVariable }>();
  for (const variable of PAIR_VARIABLES) {
    if (variable.internal) continue;
    const base = /^(.*)_[ij]$/.exec(variable.name)?.[1] ?? variable.name;
    const row = byBase.get(base);
    if (row) row.names.push(variable.name);
    else byBase.set(base, { names: [variable.name], variable });
  }
  return byBase;
}

/** A row's description: the translation keyed by its base name, else the engine's English one. */
const describe = (base: string, variable: PairVariable, paired: boolean, translated: Record<string, string> | undefined) =>
  (translated?.[base] ?? (paired ? variable.description.replace(/ of the particle receiving the force$/, '') : variable.description));

/** Variables (by base name) that no reference group lists; tests keep this empty. */
export function ungroupedVariables(): string[] {
  const grouped = new Set(GROUPS.flatMap(([, bases]) => bases));
  return [...rows().keys()].filter((base) => !grouped.has(base));
}

export function ExpressionsView() {
  const { expressions: t } = useMessages();
  const translated = variableTexts(useAppState((s) => s.locale));
  const byBase = rows();
  const ungrouped = ungroupedVariables();
  if (ungrouped.length > 0) throw new Error(`variables missing from the reference groups: ${ungrouped.join(', ')}`);

  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}><Rich text={t.intro} /></p>
      {GROUPS.map(([group, bases]) => (
        <section key={group}>
          <h3 className="section-title">{t.groups[group]}</h3>
          <dl className="reference">
            {bases.map((base) => {
              const row = byBase.get(base);
              if (!row) return null;
              return (
                <Fragment key={base}>
                  <dt className="mono">{row.names.join(', ')}</dt>
                  <dd>{describe(base, row.variable, row.names.length > 1, translated)}{row.variable.shortRangeOnly ? t.shortRangeOnly : ''}</dd>
                </Fragment>
              );
            })}
          </dl>
        </section>
      ))}
      <section>
        <h3 className="section-title">{t.functions}</h3>
        <p className="mono" style={{ margin: 0 }}>{Object.entries(FUNCTION_ARITY).map(([name, arity]) => `${name}(${'·'.repeat(arity).split('').join(', ')})`).join('  ')}</p>
        <p className="mono" style={{ margin: '4px 0 0' }}>{Object.entries(VECTOR_FUNCTIONS).map(([name, arity]) => `${name}(${'·'.repeat(arity).split('').join(', ')})`).join('  ')}</p>
        <p className="muted" style={{ margin: '4px 0 0' }}>{t.vectors}</p>
        <p className="mono" style={{ margin: '4px 0 0' }}>{t.operators}</p>
      </section>
      <section>
        <h3 className="section-title">{t.rangeTitle}</h3>
        <p className="muted" style={{ margin: 0 }}>{t.range}</p>
      </section>
    </div>
  );
}
