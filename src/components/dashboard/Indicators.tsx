import { useMemo, type ReactNode } from 'react'
import type { Game } from '../../lib/games'
import { castleBeforeMove10, queenBeforeMove5, type Indicator } from '../../lib/indicators'
import { Card } from '../Card'

interface RowProps {
  title: string
  goal: 'high' | 'low'
  ind: Indicator
  withLabel: string
  withoutLabel: string
}

function ImpactLine({ ind, withLabel, withoutLabel }: Omit<RowProps, 'title' | 'goal'>) {
  if (ind.scoreWith === null || ind.scoreWithout === null) return null
  return (
    <p className="text-xs text-muted">
      Ton score : <span className="font-medium text-fg tabular-nums">{ind.scoreWith} %</span>{' '}
      {withLabel}, <span className="font-medium text-fg tabular-nums">{ind.scoreWithout} %</span>{' '}
      {withoutLabel}.
    </p>
  )
}

function IndicatorRow({ title, goal, ind, withLabel, withoutLabel }: RowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">{title}</span>
        <span className="text-2xl font-semibold tabular-nums">
          {ind.rate === null ? '—' : `${ind.rate} %`}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded bg-surface-2"
        role="img"
        aria-label={`${title} : ${ind.rate ?? 0} %`}
      >
        <div className="h-full rounded bg-series-1" style={{ width: `${ind.rate ?? 0}%` }} />
      </div>
      <p className="text-xs text-muted tabular-nums">
        {ind.hits} parties sur {ind.eligible} · objectif :{' '}
        {goal === 'high' ? 'le plus haut' : 'le plus bas'} possible
      </p>
      <ImpactLine ind={ind} withLabel={withLabel} withoutLabel={withoutLabel} />
    </div>
  )
}

export function Indicators({
  games,
  engineSlot,
}: {
  games: readonly Game[]
  engineSlot?: ReactNode
}) {
  const castle = useMemo(() => castleBeforeMove10(games), [games])
  const queen = useMemo(() => queenBeforeMove5(games), [games])

  return (
    <Card
      title="Indicateurs palier"
      subtitle="Les habitudes qui séparent les paliers, mesurées sur chacune de tes parties."
    >
      <div className="grid gap-6 md:grid-cols-3">
        <IndicatorRow
          title="Roque avant le coup 10"
          goal="high"
          ind={castle}
          withLabel="quand tu roques tôt"
          withoutLabel="sinon"
        />
        <IndicatorRow
          title="Dame sortie avant le coup 5"
          goal="low"
          ind={queen}
          withLabel="quand ta dame sort tôt"
          withoutLabel="sinon"
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm">Pièces perdues sans compensation</span>
          </div>
          {engineSlot ?? (
            <p className="text-xs text-muted">
              Nécessite l’analyse moteur : lance Stockfish depuis l’onglet « Analyse ».
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
