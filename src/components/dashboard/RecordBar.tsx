import { pct, total, type Record3 } from '../../lib/stats'

const SEGMENTS = [
  { key: 'win', label: 'Victoires', className: 'bg-win' },
  { key: 'draw', label: 'Nulles', className: 'bg-draw' },
  { key: 'loss', label: 'Défaites', className: 'bg-loss' },
] as const

/** Barre empilée victoires / nulles / défaites, avec un séparateur de 2 px entre segments. */
export function RecordBar({ record, label }: { record: Record3; label: string }) {
  const n = total(record)
  const summary = SEGMENTS.map((s) => `${record[s.key]} ${s.label.toLowerCase()}`).join(', ')
  return (
    <div
      role="img"
      aria-label={`${label} : ${summary}`}
      className="flex h-3 w-full gap-0.5 overflow-hidden rounded"
    >
      {n === 0 ? (
        <div className="w-full bg-surface-2" />
      ) : (
        SEGMENTS.map((s) =>
          record[s.key] > 0 ? (
            <div
              key={s.key}
              title={`${s.label} : ${record[s.key]} (${pct(record[s.key], n)} %)`}
              className={s.className}
              style={{ width: `${(record[s.key] / n) * 100}%` }}
            />
          ) : null,
        )
      )}
    </div>
  )
}

export function RecordLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {SEGMENTS.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className={`size-2.5 rounded-sm ${s.className}`} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  )
}
