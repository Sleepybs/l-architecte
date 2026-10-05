import { useMemo } from 'react'
import type { GameAnalysis } from '../../lib/analysis'
import { engineSummary } from '../../lib/engineStats'
import type { Game } from '../../lib/games'
import {
  lossBreakdown,
  openingStats,
  ratingSeries,
  ratingSummary,
  recordByColor,
  recordOf,
} from '../../lib/stats'
import { Card } from '../Card'
import { ColorRecord } from './ColorRecord'
import { Indicators } from './Indicators'
import { LossBreakdown } from './LossBreakdown'
import { OpeningTable } from './OpeningTable'
import { RatingChart } from './RatingChart'
import { StatTiles } from './StatTiles'

interface Props {
  games: readonly Game[]
  timeClassLabel: string
  analyses: ReadonlyMap<string, GameAnalysis>
}

export function Dashboard({ games, timeClassLabel, analyses }: Props) {
  // useMemo : on ne recalcule les stats que si la liste de parties change.
  const stats = useMemo(() => {
    const series = ratingSeries(games)
    return {
      series,
      rating: ratingSummary(series),
      record: recordOf(games),
      byColor: recordByColor(games),
      openings: openingStats(games),
      losses: lossBreakdown(games),
    }
  }, [games])
  const engine = useMemo(() => engineSummary(games, analyses), [games, analyses])

  if (games.length === 0) {
    return <p className="text-muted">Aucune partie pour cette cadence sur la période.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <StatTiles rating={stats.rating} record={stats.record} />
      <Card title={`Courbe d’elo ${timeClassLabel}`} subtitle="Parties classées uniquement">
        <RatingChart series={stats.series} />
      </Card>
      <Indicators
        games={games}
        engineSlot={
          engine.analyzed > 0 && (
            <>
              <span className="text-2xl font-semibold tabular-nums">{engine.piecesLostRate} %</span>
              <div className="h-2 overflow-hidden rounded bg-surface-2">
                <div
                  className="h-full rounded bg-series-1"
                  style={{ width: `${engine.piecesLostRate}%` }}
                />
              </div>
              <p className="text-xs text-muted">
                des {engine.analyzed} parties analysées · objectif : le plus bas possible
              </p>
            </>
          )
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <ColorRecord byColor={stats.byColor} />
        <LossBreakdown data={stats.losses} />
      </div>
      <OpeningTable openings={stats.openings} />
    </div>
  )
}
