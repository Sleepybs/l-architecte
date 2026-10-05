import { describe, expect, it } from 'vitest'
import { analyzeGame, EVAL_CAP, materialBalance, replay, toCp } from './analysis'
import { parseBestMove, parseInfo, type EngineEval, type Evaluator } from './engine'

describe('protocole UCI', () => {
  it('lit une ligne info', () => {
    expect(
      parseInfo('info depth 12 seldepth 18 multipv 1 score cp -35 nodes 9000 pv e7e5 g1f3 b8c6'),
    ).toEqual({ depth: 12, cp: -35, mate: null, pv: ['e7e5', 'g1f3', 'b8c6'] })
    expect(parseInfo('info depth 9 score mate -2 pv h5f7')).toMatchObject({ cp: null, mate: -2 })
  })
  it('ignore les lignes sans score et les bornes provisoires', () => {
    expect(parseInfo('info string NNUE enabled')).toBeNull()
    expect(parseInfo('info depth 10 score cp 50 lowerbound pv e2e4')).toBeNull()
  })
  it('lit le meilleur coup', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4')
    expect(parseBestMove('bestmove (none)')).toBeNull()
    expect(parseBestMove('readyok')).toBeUndefined()
  })
})

describe('toCp', () => {
  it('plafonne et convertit les mats', () => {
    expect(toCp({ cp: 35, mate: null })).toBe(35)
    expect(toCp({ cp: 5000, mate: null })).toBe(EVAL_CAP)
    expect(toCp({ cp: null, mate: 3 })).toBe(EVAL_CAP)
    expect(toCp({ cp: null, mate: -1 })).toBe(-EVAL_CAP)
  })
})

describe('materialBalance', () => {
  it('compte le matériel du point de vue de chaque camp', () => {
    // Les blancs ont une dame de plus.
    const fen = 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    expect(materialBalance(fen, 'white')).toBe(9)
    expect(materialBalance(fen, 'black')).toBe(-9)
  })
})

// Coup du berger : 3...Cf6?? permet 4.Dxf7#.
const SCHOLAR = '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0'

/** Faux moteur : évaluations (point de vue des blancs) données position par position. */
function scripted(pgn: string, whiteEvals: (number | 'mate')[], best: Record<number, string> = {}) {
  const { fens } = replay(pgn)
  const calls: string[] = []
  const evaluator: Evaluator = {
    async evaluate(fen): Promise<EngineEval> {
      calls.push(fen)
      const i = fens.indexOf(fen)
      const w = whiteEvals[i] ?? 0
      const whiteToMove = fen.split(' ')[1] === 'w'
      if (w === 'mate')
        return { cp: null, mate: whiteToMove ? 1 : -1, bestMove: best[i] ?? null, depth: 10 }
      return { cp: whiteToMove ? w : -w, mate: null, bestMove: best[i] ?? null, depth: 10 }
    },
  }
  return { evaluator, calls }
}

describe('analyzeGame', () => {
  it('trouve la gaffe, le meilleur coup et le tournant', async () => {
    const { evaluator, calls } = scripted(SCHOLAR, [20, 30, 20, 30, 30, 20, 'mate'], {
      5: 'g7g6',
      6: 'h5f7',
    })
    const progress: number[] = []
    const a = await analyzeGame(SCHOLAR, evaluator, {
      depth: 10,
      onProgress: (d) => progress.push(d),
    })

    expect(calls).toHaveLength(7) // la position finale (mat) n'a pas besoin du moteur
    expect(progress.at(-1)).toBe(8)
    expect(a.evals.at(-1)).toBe(EVAL_CAP)
    expect(a.mistakes).toHaveLength(1)
    expect(a.mistakes[0]).toMatchObject({
      ply: 5,
      moveNumber: 3,
      color: 'black',
      played: 'Nf6',
      best: 'g6',
      bestUci: 'g7g6',
      before: -20,
      after: -EVAL_CAP,
      materialLost: false, // un seul pion pris : pas une pièce
    })
    expect(a.turningPoint).toEqual({ ply: 5, moveNumber: 3, color: 'black' })
  })

  it('ne compte jamais le meilleur coup comme une gaffe', async () => {
    // Même si l'évaluation chute (bruit du moteur), jouer le coup conseillé n'est pas une faute.
    const { evaluator } = scripted('1. e4 e5 *', [0, 0, -500], { 1: 'e7e5' })
    const a = await analyzeGame('1. e4 e5 *', evaluator, { depth: 10 })
    expect(a.mistakes).toHaveLength(0)
    expect(a.turningPoint).toBeNull()
  })

  it('détecte une pièce perdue sans compensation', async () => {
    // 2.Cg5?? laisse le cavalier en prise : 2...Dxg5 le gagne, sans contrepartie.
    const pgn = '1. Nf3 e5 2. Ng5 Qxg5 3. d3 d6 4. e3 c6 *'
    const { evaluator } = scripted(pgn, [20, 20, 20, -300, -320, -310, -330, -320, -330], {
      2: 'b1c3',
    })
    const a = await analyzeGame(pgn, evaluator, { depth: 10 })
    const blunder = a.mistakes.find((m) => m.color === 'white')
    expect(blunder).toMatchObject({ played: 'Ng5', materialLost: true })
  })

  it('peut être annulée', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const { evaluator } = scripted(SCHOLAR, [])
    await expect(
      analyzeGame(SCHOLAR, evaluator, { depth: 10, signal: ctrl.signal }),
    ).rejects.toBeDefined()
  })
})
