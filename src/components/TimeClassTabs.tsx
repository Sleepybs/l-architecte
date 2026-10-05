import type { TimeClass } from '../lib/games'

const TABS: { value: TimeClass; label: string }[] = [
  { value: 'rapid', label: 'Rapid' },
  { value: 'blitz', label: 'Blitz' },
  { value: 'daily', label: 'Daily' },
]

interface Props {
  value: TimeClass
  counts: Record<TimeClass, number>
  onChange: (value: TimeClass) => void
}

export function TimeClassTabs({ value, counts, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Cadence" className="inline-flex rounded-lg bg-surface-2 p-1">
      {TABS.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            value === t.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
          }`}
        >
          {t.label} <span className="tabular-nums opacity-60">{counts[t.value]}</span>
        </button>
      ))}
    </div>
  )
}
