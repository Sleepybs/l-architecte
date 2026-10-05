import type { GameAnalysis } from '../../lib/analysis'
import { playerMistakes } from '../../lib/engineStats'
import type { Game } from '../../lib/games'

/** Résumé de l'analyse moteur d'une partie, affiché dans la liste des parties. */
export function BlunderBadge({ game, analysis }: { game: Game; analysis?: GameAnalysis }) {
  if (!analysis) return null
  const n = playerMistakes(game, analysis).length
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[11px] ${
        n === 0 ? 'bg-win/15 text-win' : 'bg-loss/15 text-loss'
      }`}
    >
      {n === 0 ? 'aucune gaffe' : `${n} gaffe${n > 1 ? 's' : ''}`}
    </span>
  )
}
