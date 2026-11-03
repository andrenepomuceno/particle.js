/** A row of tab buttons showing `labels`; the caller renders the selected tab's content. */
export function Tabs<T extends string>({ tabs, labels, value, onChange }: {
  tabs: readonly T[]; labels: Record<T, string>; value: T; onChange: (tab: T) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t} role="tab" aria-selected={value === t} className={value === t ? 'tab active' : 'tab'} onClick={() => onChange(t)}>{labels[t]}</button>
      ))}
    </div>
  );
}
