// Analyse moteur d'une partie : gaffes, premier gros tournant, pièces perdues sans compensation.
import { Chess } from 'chess.js'
import type { EngineEval, Evaluator } from './engine'
import type { Color } from './games'
import { sanMoves } from './indicators'

/** À incrémenter si la méthode d'analyse change (les analyses en cache seront refaites). */
export const ANALYSIS_VERSION = 1
/** Une gaffe : plus de 2 pions perdus d'évaluation sur un seul coup. */
export const BLUNDER_CP = 200
/** Évaluations plafonnées à ±10 pions : au-delà, la partie est jouée, l'écart n'a plus de sens. */
export const EVAL_CAP = 1000
/** Nombre de demi-coups après la gaffe pour constater une perte de matériel (échanges terminés). */
const MATERIAL_HORIZON = 4

export interface Mistake {
  /** Indice du demi-coup (0 = premier coup des blancs). */
  ply: number
  moveNumber: number
  color: Color
  /** Position juste avant l'erreur : c'est le puzzle à rejouer. */
  fenBefore: string
  played: string // SAN
  playedUci: string
  best: string | null // SAN
  bestUci: string | null
  /** Évaluations (centipions, point de vue de celui qui joue) avant et après le coup. */
  before: number
  after: number
  loss: number
  /** Du matériel (≥ une pièce mineure) a été perdu et l'évaluation confirme : pas de compensation. */
  materialLost: boolean
}

export interface GameAnalysis {
  version: number
  depth: number
  analyzedAt: number
  /** Évaluation de chaque position, point de vue des blancs (centipions plafonnés). */
  evals: number[]
  /** Toutes les gaffes de la partie, des deux camps. */
  mistakes: Mistake[]
  /** La première gaffe de la partie (quel que soit le camp) : le moment où elle a basculé. */
  turningPoint: Pick<Mistake, 'ply' | 'moveNumber' | 'color'> | null
}

/** Convertit une évaluation moteur en centipions plafonnés, point de vue du camp au trait. */
export function toCp(e: Pick<EngineEval, 'cp' | 'mate'>): number {
  if (e.mate !== null) return e.mate > 0 ? EVAL_CAP : -EVAL_CAP
  return Math.max(-EVAL_CAP, Math.min(EVAL_CAP, e.cp ?? 0))
}

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

/** Bilan matériel (en pions) pour `color` : ses pièces moins celles de l'adversaire. */
export function materialBalance(fen: string, color: Color): number {
  const board = fen.split(' ')[0] ?? ''
  let white = 0
  let black = 0
  for (const ch of board) {
    const v = PIECE_VALUE[ch.toLowerCase()]
    if (v === undefined) continue
    if (ch === ch.toUpperCase()) white += v
    else black += v
  }
  return color === 'white' ? white - black : black - white
}

interface Ply {
  fenBefore: string
  san: string
  uci: string
  color: Color
}

/** Rejoue la partie et liste chaque demi-coup avec la position qui le précède. */
export function replay(pgn: string): { plies: Ply[]; fens: string[]; final: Chess } {
  const fen = /^\[FEN "([^"]+)"\]/m.exec(pgn)?.[1]
  const chess = new Chess(fen)
  const fens = [chess.fen()]
  const plies: Ply[] = []
  for (const san of sanMoves(pgn)) {
    const fenBefore = chess.fen()
    let move
    try {
      move = chess.move(san)
    } catch {
      break
    }
    plies.push({
      fenBefore,
      san: move.san,
      uci: move.from + move.to + (move.promotion ?? ''),
      color: move.color === 'w' ? 'white' : 'black',
    })
    fens.push(chess.fen())
  }
  return { plies, fens, final: chess }
}

function uciToSan(fen: string, uci: string | null): string | null {
  if (!uci) return null
  try {
    const chess = new Chess(fen)
    return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san
  } catch {
    return null
  }
}

export interface AnalyzeOptions {
  depth: number
  signal?: AbortSignal
  onProgress?: (done: number, total: number) => void
}

export async function analyzeGame(
  pgn: string,
  evaluator: Evaluator,
  opts: AnalyzeOptions,
): Promise<GameAnalysis> {
  const { plies, fens } = replay(pgn)

  // 1. Une évaluation par position (l'évaluation « après » un coup est celle « avant » le suivant).
  const evals: number[] = [] // point de vue des blancs
  const bestMoves: (string | null)[] = []
  for (const [i, fen] of fens.entries()) {
    if (opts.signal?.aborted) throw opts.signal.reason ?? new Error('Analyse annulée')
    const chess = new Chess(fen)
    const whiteToMove = chess.turn() === 'w'
    let cp: number
    let best: string | null = null
    if (chess.isCheckmate())
      cp = -EVAL_CAP // le camp au trait est maté
    else if (chess.isDraw()) cp = 0
    else {
      const e = await evaluator.evaluate(fen, opts.depth)
      cp = toCp(e)
      best = e.bestMove
    }
    evals.push(whiteToMove ? cp : -cp)
    bestMoves.push(best)
    opts.onProgress?.(i + 1, fens.length)
  }

  // 2. Chaque coup : combien a-t-il coûté au camp qui l'a joué ?
  const persp = (whiteCp: number, c: Color) => (c === 'white' ? whiteCp : -whiteCp)
  const mistakes: Mistake[] = []
  for (const [i, p] of plies.entries()) {
    const before = persp(evals[i] ?? 0, p.color)
    const after = persp(evals[i + 1] ?? 0, p.color)
    const bestUci = bestMoves[i] ?? null
    // Le meilleur coup ne peut pas être une gaffe (protège du « bruit » du moteur).
    const loss = p.uci === bestUci ? 0 : before - after
    if (loss <= BLUNDER_CP) continue

    const horizon = Math.min(i + 1 + MATERIAL_HORIZON, fens.length - 1)
    const materialDrop =
      materialBalance(fens[horizon] ?? '', p.color) - materialBalance(p.fenBefore, p.color)
    const stillBad = persp(evals[horizon] ?? 0, p.color) <= before - BLUNDER_CP

    mistakes.push({
      ply: i,
      moveNumber: Math.floor(i / 2) + 1,
      color: p.color,
      fenBefore: p.fenBefore,
      played: p.san,
      playedUci: p.uci,
      best: uciToSan(p.fenBefore, bestUci),
      bestUci,
      before,
      after,
      loss,
      materialLost: materialDrop <= -3 && stillBad,
    })
  }

  const first = mistakes[0]
  return {
    version: ANALYSIS_VERSION,
    depth: opts.depth,
    analyzedAt: Date.now(),
    evals,
    mistakes,
    turningPoint: first
      ? { ply: first.ply, moveNumber: first.moveNumber, color: first.color }
      : null,
  }
}
