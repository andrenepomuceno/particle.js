/** A row of tab buttons; the caller renders the selected tab's content. */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: readonly T[]; value: T; onChange: (tab: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t} role="tab" aria-selected={value === t} className={value === t ? 'tab active' : 'tab'} onClick={() => onChange(t)}>{t}</button>
      ))}
    </div>
  );
}
