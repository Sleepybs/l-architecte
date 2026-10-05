import { useMemo } from 'react'
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

export function Dashboard({
  games,
  timeClassLabel,
}: {
  games: readonly Game[]
  timeClassLabel: string
}) {
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

  if (games.length === 0) {
    return <p className="text-muted">Aucune partie pour cette cadence sur la période.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <StatTiles rating={stats.rating} record={stats.record} />
      <Card title={`Courbe d’elo ${timeClassLabel}`} subtitle="Parties classées uniquement">
        <RatingChart series={stats.series} />
      </Card>
      <Indicators games={games} />
      <div className="grid gap-4 md:grid-cols-2">
        <ColorRecord byColor={stats.byColor} />
        <LossBreakdown data={stats.losses} />
      </div>
      <OpeningTable openings={stats.openings} />
    </div>
  )
}
