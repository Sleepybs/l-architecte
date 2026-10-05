// Indicateurs « palier » : habitudes d'ouverture mesurées partie par partie avec chess.js.
import { Chess } from 'chess.js'
import type { Color, Game } from './games'
import { score, type Record3 } from './stats'

/** Ce qui s'est passé pendant les 10 premiers coups du joueur. */
export interface EarlyMoves {
  /** Numéro du coup où le joueur a roqué (null : pas de roque dans la fenêtre). */
  castleMove: number | null
  /** Numéro du coup où le joueur a bougé sa dame pour la première fois. */
  queenMove: number | null
  /** Nombre de coups joués par le joueur dans la fenêtre (au plus WINDOW). */
  movesPlayed: number
}

const WINDOW = 10
const RESULT_TOKENS = new Set(['1-0', '0-1', '1/2-1/2', '*'])

/** Extrait la liste des coups (notation SAN) d'un PGN : sans en-têtes, commentaires ni numéros. */
export function sanMoves(pgn: string): string[] {
  const body = pgn
    .replace(/^\[.*\]\s*$/gm, ' ') // en-têtes [Tag "valeur"]
    .replace(/\{[^}]*\}/g, ' ') // commentaires {[%clk 0:09:58]}
    .replace(/\([^()]*\)/g, ' ') // variantes (rares chez chess.com)
    .replace(/\$\d+/g, ' ') // annotations $1, $2…
  return body
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.+/, '')) // « 12.e4 » ou « 12... »
    .filter((t) => t !== '' && !RESULT_TOKENS.has(t))
}

function startFen(pgn: string): string | undefined {
  const m = /^\[FEN "([^"]+)"\]/m.exec(pgn)
  return m?.[1]
}

/**
 * Rejoue les premiers coups avec chess.js (qui valide chaque coup)
 * et note quand le joueur roque et quand sa dame sort.
 */
export function earlyMoves(pgn: string, color: Color): EarlyMoves | null {
  let chess: Chess
  try {
    chess = new Chess(startFen(pgn))
  } catch {
    return null
  }
  const me = color === 'white' ? 'w' : 'b'
  const result: EarlyMoves = { castleMove: null, queenMove: null, movesPlayed: 0 }

  for (const san of sanMoves(pgn)) {
    let move
    try {
      move = chess.move(san)
    } catch {
      break // coup illisible : on garde ce qu'on a déjà mesuré
    }
    if (move.color !== me) continue
    result.movesPlayed++
    const n = result.movesPlayed
    if (result.castleMove === null && (move.isKingsideCastle() || move.isQueensideCastle())) {
      result.castleMove = n
    }
    if (result.queenMove === null && move.piece === 'q') result.queenMove = n
    if (n >= WINDOW) break
  }
  return result
}

export interface Indicator {
  /** Parties où l'habitude est observée. */
  hits: number
  /** Parties assez longues pour juger. */
  eligible: number
  /** Pourcentage (null si aucune partie éligible). */
  rate: number | null
  /** Score (victoire = 1, nulle = ½) avec et sans l'habitude : l'impact réel sur tes résultats. */
  scoreWith: number | null
  scoreWithout: number | null
}

function indicator(
  games: readonly Game[],
  classify: (e: EarlyMoves) => boolean | null, // null = partie non éligible
): Indicator {
  const withR: Record3 = { win: 0, draw: 0, loss: 0 }
  const withoutR: Record3 = { win: 0, draw: 0, loss: 0 }
  for (const g of games) {
    if (!g.early) continue
    const hit = classify(g.early)
    if (hit === null) continue
    ;(hit ? withR : withoutR)[g.outcome]++
  }
  const hits = withR.win + withR.draw + withR.loss
  const eligible = hits + withoutR.win + withoutR.draw + withoutR.loss
  return {
    hits,
    eligible,
    rate: eligible === 0 ? null : Math.round((hits / eligible) * 100),
    scoreWith: hits === 0 ? null : score(withR),
    scoreWithout: eligible - hits === 0 ? null : score(withoutR),
  }
}

/** Roque avant le coup 10 : roque aux coups 1 à 9. Parties finies avant le coup 10 sans roque : ignorées. */
export function castleBeforeMove10(games: readonly Game[]): Indicator {
  return indicator(games, (e) => {
    if (e.castleMove !== null && e.castleMove < 10) return true
    return e.movesPlayed >= 10 ? false : null
  })
}

/** Dame sortie avant le coup 5 : dame jouée aux coups 1 à 4. Parties de moins de 4 coups : ignorées. */
export function queenBeforeMove5(games: readonly Game[]): Indicator {
  return indicator(games, (e) => {
    if (e.queenMove !== null && e.queenMove < 5) return true
    return e.movesPlayed >= 4 ? false : null
  })
}
