import { useMemo } from 'react'
import { useJournal } from '../../hooks/useJournal'
import { useMission } from '../../hooks/useMission'
import type { GameAnalysis } from '../../lib/analysis'
import type { Game, TimeClass } from '../../lib/games'
import { today } from '../../lib/journal'
import { weekStart } from '../../lib/mission'
import { buildPuzzles, type PuzzleResult } from '../../lib/puzzles'
import { Journal } from './Journal'
import { MissionCard } from './MissionCard'

interface Props {
  username: string
  timeClass: TimeClass
  games: readonly Game[]
  analyses: ReadonlyMap<string, GameAnalysis>
  puzzles: ReadonlyMap<string, PuzzleResult>
}

export function ProgressView({ username, timeClass, games, analyses, puzzles }: Props) {
  const ctx = useMemo(
    () => ({ games, analyses, puzzles, puzzleCount: buildPuzzles(games, analyses).length }),
    [games, analyses, puzzles],
  )
  const { mission, progress, change, canChange } = useMission(username, timeClass, ctx)
  const journal = useJournal(username)

  return (
    <div className="flex flex-col gap-4">
      {mission && progress && (
        <MissionCard
          mission={mission}
          progress={progress}
          canChange={canChange}
          onChange={change}
        />
      )}
      <Journal
        entries={journal.entries}
        weekSince={today(weekStart(new Date()))}
        onAdd={journal.add}
        onRemove={(id) => void journal.remove(id)}
      />
    </div>
  )
}
