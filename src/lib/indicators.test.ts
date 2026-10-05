import { describe, expect, it } from 'vitest'
import type { Game } from './games'
import {
  castleBeforeMove10,
  earlyMoves,
  queenBeforeMove5,
  sanMoves,
  type EarlyMoves,
} from './indicators'

// Format réel chess.com : en-têtes, horloges en commentaires, numéros « 1... ».
const ITALIAN = `[Event "Live Chess"]
[White "alice"]
[Black "bob"]
[Result "1-0"]

1. e4 {[%clk 0:09:58]} 1... e5 {[%clk 0:09:57]} 2. Nf3 {[%clk 0:09:55]} 2... Nc6 {[%clk 0:09:50]}
3. Bc4 {[%clk 0:09:50]} 3... Bc5 {[%clk 0:09:45]} 4. O-O {[%clk 0:09:40]} 4... Qf6 {[%clk 0:09:30]}
5. d3 5... Nge7 6. c3 6... O-O 1-0`

describe('sanMoves', () => {
  it('ne garde que les coups', () => {
    expect(sanMoves(ITALIAN)).toEqual([
      'e4',
      'e5',
      'Nf3',
      'Nc6',
      'Bc4',
      'Bc5',
      'O-O',
      'Qf6',
      'd3',
      'Nge7',
      'c3',
      'O-O',
    ])
  })
  it('gère les numéros collés aux coups et les annotations', () => {
    expect(sanMoves('1.e4 $1 e5 2.Nf3 (2.f4 exf4) Nc6 *')).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])
  })
})

describe('earlyMoves', () => {
  it('voit le roque et la dame de chaque camp', () => {
    expect(earlyMoves(ITALIAN, 'white')).toEqual({ castleMove: 4, queenMove: null, movesPlayed: 6 })
    expect(earlyMoves(ITALIAN, 'black')).toEqual({ castleMove: 6, queenMove: 4, movesPlayed: 6 })
  })

  it('s’arrête à 10 coups du joueur', () => {
    const moves =
      '1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 5. Nf3 Nf6 6. Ng1 Ng8 7. Nf3 Nf6 8. Ng1 Ng8 9. Nf3 Nf6 10. Ng1 Ng8 11. e4 e5 12. Bc4 Bc5 13. Nf3 Nf6 14. O-O'
    expect(earlyMoves(moves, 'white')).toEqual({
      castleMove: null,
      queenMove: null,
      movesPlayed: 10,
    })
  })

  it('s’arrête proprement sur un coup illégal', () => {
    expect(earlyMoves('1. e4 e5 2. Qh5 Ke9', 'white')).toEqual({
      castleMove: null,
      queenMove: 2,
      movesPlayed: 2,
    })
  })
})

function g(early: EarlyMoves | null, outcome: Game['outcome'] = 'win'): Game {
  return { early, outcome } as Game
}

describe('castleBeforeMove10', () => {
  it('compte les roques aux coups 1 à 9 et ignore les parties trop courtes', () => {
    const ind = castleBeforeMove10([
      g({ castleMove: 4, queenMove: null, movesPlayed: 10 }, 'win'),
      g({ castleMove: 10, queenMove: null, movesPlayed: 10 }, 'loss'), // trop tard
      g({ castleMove: null, queenMove: null, movesPlayed: 10 }, 'draw'),
      g({ castleMove: null, queenMove: null, movesPlayed: 6 }), // trop courte : ignorée
      g(null), // PGN illisible : ignoré
    ])
    expect(ind).toEqual({ hits: 1, eligible: 3, rate: 33, scoreWith: 100, scoreWithout: 25 })
  })
})

describe('queenBeforeMove5', () => {
  it('compte les dames jouées aux coups 1 à 4', () => {
    const ind = queenBeforeMove5([
      g({ castleMove: null, queenMove: 2, movesPlayed: 3 }, 'loss'), // courte mais dame sortie : comptée
      g({ castleMove: null, queenMove: 5, movesPlayed: 10 }),
      g({ castleMove: null, queenMove: null, movesPlayed: 2 }), // trop courte
    ])
    expect(ind).toEqual({ hits: 1, eligible: 2, rate: 50, scoreWith: 0, scoreWithout: 100 })
  })
  it('renvoie null sans partie éligible', () => {
    expect(queenBeforeMove5([]).rate).toBeNull()
  })
})
