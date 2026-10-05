import { useState } from 'react'
import type { OpeningStat } from '../../lib/stats'
import { Card } from '../Card'
import { RecordBar, RecordLegend } from './RecordBar'

const COLOR_LABEL = { white: 'Blancs', black: 'Noirs' } as const

/** Score sous 45 % sur au moins 5 parties : ouverture à retravailler. */
function isWeak(o: OpeningStat): boolean {
  return o.games >= 5 && o.score < 45
}

export function OpeningTable({ openings }: { openings: OpeningStat[] }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? openings : openings.slice(0, 8)

  return (
    <Card
      title="Mes ouvertures"
      subtitle="Regroupées par famille et par couleur, 3 parties minimum. Score : victoire = 1, nulle = ½."
    >
      {openings.length === 0 ? (
        <p className="text-sm text-muted">Pas encore assez de parties par ouverture.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="divide-y divide-line">
            {visible.map((o) => (
              <li
                key={`${o.color}-${o.name}`}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 py-2.5 text-sm sm:grid-cols-[1fr_9rem_10rem_3.5rem]"
              >
                <div className="min-w-0">
                  <span className="font-medium">{o.name}</span>
                  {isWeak(o) && (
                    <span className="ml-2 rounded bg-loss/15 px-1.5 py-0.5 text-xs text-loss">
                      à revoir
                    </span>
                  )}
                </div>
                <div className="row-start-2 text-xs text-muted tabular-nums sm:row-start-auto">
                  {COLOR_LABEL[o.color]} · {o.games} parties
                </div>
                <div className="col-span-2 row-start-3 sm:col-span-1 sm:row-start-auto">
                  <RecordBar record={o.record} label={o.name} />
                </div>
                <div className="row-span-2 text-right font-semibold tabular-nums sm:row-span-1">
                  {o.score} %
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3">
            <RecordLegend />
            {openings.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-xs text-accent hover:underline"
              >
                {showAll ? 'Voir moins' : `Voir les ${openings.length}`}
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
