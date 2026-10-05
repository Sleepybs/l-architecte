// Statistiques tirées des analyses moteur : ce qui coûte vraiment des parties.
import type { GameAnalysis, Mistake } from './analysis'
import type { Game } from './games'

export type Phase = 'opening' | 'middlegame' | 'endgame'

export const PHASE_LABEL: Record<Phase, string> = {
  opening: 'Ouverture (coups 1–12)',
  middlegame: 'Milieu de partie (13–30)',
  endgame: 'Fin de partie (31+)',
}

/** Découpage simple par numéro de coup : lisible et stable d'une partie à l'autre. */
export function phaseOf(moveNumber: number): Phase {
  if (moveNumber <= 12) return 'opening'
  if (moveNumber <= 30) return 'middlegame'
  return 'endgame'
}

/** Les gaffes du joueur (pas celles de l'adversaire). */
export function playerMistakes(game: Game, analysis: GameAnalysis): Mistake[] {
  return analysis.mistakes.filter((m) => m.color === game.color)
}

export interface EngineSummary {
  analyzed: number
  /** Gaffes du joueur par partie analysée. */
  blundersPerGame: number
  /** % des parties analysées où le joueur perd au moins une pièce sans compensation. */
  piecesLostRate: number
  /** Coup médian de la première gaffe du joueur (null si aucune). */
  medianFirstBlunder: number | null
  /** % des parties où c'est le joueur qui a commis la première grosse erreur. */
  ownTurningPointRate: number
  byPhase: Record<Phase, number>
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? (s[mid] ?? null) : Math.round(((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2)
}

export function engineSummary(
  games: readonly Game[],
  analyses: ReadonlyMap<string, GameAnalysis>,
): EngineSummary {
  let analyzed = 0
  let blunders = 0
  let withPieceLost = 0
  let ownTurning = 0
  const firsts: number[] = []
  const byPhase: Record<Phase, number> = { opening: 0, middlegame: 0, endgame: 0 }

  for (const g of games) {
    const a = analyses.get(g.id)
    if (!a) continue
    analyzed++
    const mine = playerMistakes(g, a)
    blunders += mine.length
    if (mine.some((m) => m.materialLost)) withPieceLost++
    if (a.turningPoint?.color === g.color) ownTurning++
    const first = mine[0]
    if (first) firsts.push(first.moveNumber)
    for (const m of mine) byPhase[phaseOf(m.moveNumber)]++
  }

  const rate = (n: number) => (analyzed === 0 ? 0 : Math.round((n / analyzed) * 100))
  return {
    analyzed,
    blundersPerGame: analyzed === 0 ? 0 : Math.round((blunders / analyzed) * 10) / 10,
    piecesLostRate: rate(withPieceLost),
    medianFirstBlunder: median(firsts),
    ownTurningPointRate: rate(ownTurning),
    byPhase,
  }
}

// En notation SAN, seules les pièces sont en majuscules (les colonnes sont en minuscules).
const FR_PIECES: Record<string, string> = { K: 'R', Q: 'D', R: 'T', B: 'F', N: 'C' }

/** Notation française : « Nf3 » → « Cf3 », « exd8=Q+ » → « exd8=D+ ». */
export function toFrenchSan(san: string): string {
  return san.replace(/[KQRBN]/g, (p) => FR_PIECES[p] ?? p)
}

/** Formate une évaluation en pions : 235 → « +2,4 ». */
export function formatEval(cp: number): string {
  const v = (cp / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return cp > 0 ? `+${v}` : v
}
