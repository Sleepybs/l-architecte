import type { Color } from '../../lib/games'
import { pct, total, type Record3 } from '../../lib/stats'
import { Card } from '../Card'
import { RecordBar, RecordLegend } from './RecordBar'

const LABEL: Record<Color, string> = { white: 'Avec les blancs', black: 'Avec les noirs' }

export function ColorRecord({ byColor }: { byColor: Record<Color, Record3> }) {
  return (
    <Card title="Victoires par couleur">
      <div className="flex flex-col gap-4">
        {(['white', 'black'] as const).map((color) => {
          const r = byColor[color]
          const n = total(r)
          return (
            <div key={color} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`size-3 rounded-full border border-line ${
                      color === 'white' ? 'bg-white' : 'bg-neutral-900'
                    }`}
                  />
                  {LABEL[color]}
                </span>
                <span className="tabular-nums">
                  <span className="text-lg font-semibold">{pct(r.win, n)} %</span>{' '}
                  <span className="text-xs text-muted">de victoires · {n} parties</span>
                </span>
              </div>
              <RecordBar record={r} label={LABEL[color]} />
            </div>
          )
        })}
        <RecordLegend />
      </div>
    </Card>
  )
}
