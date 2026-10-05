import type { RatingSummary, Record3 } from '../../lib/stats'
import { score, total } from '../../lib/stats'

interface Props {
  rating: RatingSummary | null
  record: Record3
}

function Tile({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {detail && <div className="mt-0.5 text-xs text-muted tabular-nums">{detail}</div>}
    </div>
  )
}

export function StatTiles({ rating, record }: Props) {
  const delta = rating?.delta ?? 0
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile
        label="Elo actuel"
        value={rating ? String(rating.current) : '—'}
        detail={
          rating && (
            <span className={delta > 0 ? 'text-win' : delta < 0 ? 'text-loss' : undefined}>
              {delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : ''}
              {delta} sur la période
            </span>
          )
        }
      />
      <Tile
        label="Record"
        value={rating ? String(rating.peak) : '—'}
        detail="elo max sur la période"
      />
      <Tile
        label="Parties"
        value={String(total(record))}
        detail={`${record.win} V · ${record.draw} N · ${record.loss} D`}
      />
      <Tile label="Score" value={`${score(record)} %`} detail="victoire = 1, nulle = ½" />
    </div>
  )
}
