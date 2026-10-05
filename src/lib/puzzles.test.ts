import { describe, expect, it } from 'vitest'
import type { GameAnalysis, Mistake } from './analysis'
import type { Evaluator } from './engine'
import type { Game } from './games'
import { buildPuzzles, judgeMove, tryMove, type Puzzle } from './puzzles'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function mistake(ply: number, color: Mistake['color'], best: string | null = 'e4'): Mistake {
  return {
    ply,
    moveNumber: Math.floor(ply / 2) + 1,
    color,
    fenBefore: START,
    played: 'a4',
    playedUci: 'a2a4',
    best,
    bestUci: best ? 'e2e4' : null,
    before: 30,
    after: -300,
    loss: 330,
    materialLost: false,
  }
}

const analysis = (mistakes: Mistake[]) => ({ mistakes }) as GameAnalysis
const game = (id: string, endTime: number) =>
  ({ id, endTime, color: 'white', opponent: 'bob' }) as Game

describe('buildPuzzles', () => {
  it('garde les gaffes du joueur avec un meilleur coup connu, les plus récentes d’abord', () => {
    const puzzles = buildPuzzles(
      [game('old', 1), game('new', 2)],
      new Map([
        ['old', analysis([mistake(0, 'white')])],
        ['new', analysis([mistake(2, 'white'), mistake(3, 'black'), mistake(4, 'white', null)])],
      ]),
    )
    expect(puzzles.map((p) => p.id)).toEqual(['new:2', 'old:0'])
    expect(puzzles[0]).toMatchObject({ best: 'e4', bestUci: 'e2e4', bestEval: 30, played: 'a4' })
  })
})

describe('tryMove', () => {
  it('accepte un coup légal et refuse le reste', () => {
    expect(tryMove(START, 'e2', 'e4')).toMatchObject({ uci: 'e2e4', san: 'e4' })
    expect(tryMove(START, 'e2', 'e5')).toBeNull()
  })
  it('promeut en dame par défaut', () => {
    expect(tryMove('8/P7/8/8/8/8/8/k6K w - - 0 1', 'a7', 'a8')).toMatchObject({ uci: 'a7a8q' })
  })
})

/** Joue un coup depuis la position initiale ; échoue le test s'il est illégal. */
function legal(from: string, to: string) {
  const move = tryMove(START, from, to)
  if (!move) throw new Error(`coup illégal ${from}${to}`)
  return move
}

describe('judgeMove', () => {
  const puzzle = { bestUci: 'e2e4', bestEval: 30 } as Puzzle
  // Faux moteur : renvoie une évaluation fixe du point de vue du camp au trait (l'adversaire).
  const engine = (cpForOpponent: number): Evaluator => ({
    evaluate: async () => ({ cp: cpForOpponent, mate: null, bestMove: null, depth: 10 }),
  })

  it('reconnaît le meilleur coup sans appeler le moteur', async () => {
    const move = legal('e2', 'e4')
    const never: Evaluator = {
      evaluate: () => Promise.reject(new Error('ne doit pas être appelé')),
    }
    expect(await judgeMove(puzzle, move, never, 10)).toBe('best')
  })

  it('accepte une alternative presque aussi bonne', async () => {
    const move = legal('d2', 'd4')
    expect(await judgeMove(puzzle, move, engine(-10), 10)).toBe('good') // +0,1 pour le joueur
  })

  it('refuse un coup nettement moins bon', async () => {
    const move = legal('a2', 'a4')
    expect(await judgeMove(puzzle, move, engine(80), 10)).toBe('wrong') // −0,8 pour le joueur
  })
})
