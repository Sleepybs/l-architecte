// « Mes erreurs en puzzles » : chaque gaffe devient une position à rejouer.
import { Chess } from 'chess.js'
import { EVAL_CAP, toCp, type GameAnalysis } from './analysis'
import type { Evaluator } from './engine'
import { playerMistakes } from './engineStats'
import type { Color, Game } from './games'

export interface Puzzle {
  id: string
  gameId: string
  fen: string
  color: Color
  moveNumber: number
  /** Ce que le joueur avait joué (SAN) et ce que le moteur conseillait. */
  played: string
  playedUci: string
  best: string
  bestUci: string
  /** Évaluation (point de vue du joueur) avec le meilleur coup : la référence. */
  bestEval: number
  loss: number
  endTime: number
  opponent: string
}

export interface PuzzleResult {
  solved: boolean
  attempts: number
  lastAt: number
}

export function buildPuzzles(
  games: readonly Game[],
  analyses: ReadonlyMap<string, GameAnalysis>,
): Puzzle[] {
  const out: Puzzle[] = []
  for (const g of games) {
    const a = analyses.get(g.id)
    if (!a) continue
    for (const m of playerMistakes(g, a)) {
      if (!m.best || !m.bestUci) continue
      out.push({
        id: `${g.id}:${m.ply}`,
        gameId: g.id,
        fen: m.fenBefore,
        color: g.color,
        moveNumber: m.moveNumber,
        played: m.played,
        playedUci: m.playedUci,
        best: m.best,
        bestUci: m.bestUci,
        bestEval: m.before,
        loss: m.loss,
        endTime: g.endTime,
        opponent: g.opponent,
      })
    }
  }
  return out.sort((x, y) => y.endTime - x.endTime)
}

export interface TriedMove {
  uci: string
  san: string
  fenAfter: string
}

/** Vérifie qu'un coup est légal dans la position ; renvoie null sinon. */
export function tryMove(fen: string, from: string, to: string): TriedMove | null {
  try {
    const chess = new Chess(fen)
    // Promotion en dame par défaut (les sous-promotions sont rarissimes dans ce contexte).
    const move = chess.move({ from, to, promotion: 'q' })
    return {
      uci: move.from + move.to + (move.promotion ?? ''),
      san: move.san,
      fenAfter: chess.fen(),
    }
  } catch {
    return null
  }
}

/** Tolérance : un autre coup est accepté s'il perd au plus 0,5 pion par rapport au meilleur. */
export const ALTERNATIVE_TOLERANCE = 50

export type Verdict = 'best' | 'good' | 'wrong'

/**
 * Juge le coup proposé : le meilleur coup du moteur, une alternative presque aussi bonne
 * (vérifiée avec le moteur), ou un coup qui ne sauve pas la position.
 */
export async function judgeMove(
  puzzle: Puzzle,
  move: TriedMove,
  evaluator: Evaluator,
  depth: number,
): Promise<Verdict> {
  if (move.uci === puzzle.bestUci) return 'best'
  const after = new Chess(move.fenAfter)
  let evalForPlayer: number
  if (after.isCheckmate()) {
    evalForPlayer = EVAL_CAP // le joueur vient de mater
  } else if (after.isDraw()) {
    evalForPlayer = 0
  } else {
    // Le moteur évalue du point de vue de l'adversaire (c'est à lui de jouer) : on inverse.
    evalForPlayer = -toCp(await evaluator.evaluate(move.fenAfter, depth))
  }
  return evalForPlayer >= puzzle.bestEval - ALTERNATIVE_TOLERANCE ? 'good' : 'wrong'
}
