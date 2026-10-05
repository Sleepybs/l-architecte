import { describe, expect, it } from 'vitest'
import type { GameAnalysis, Mistake } from './analysis'
import { engineSummary, formatEval, phaseOf, toFrenchSan } from './engineStats'
import type { Game } from './games'

function mistake(moveNumber: number, color: Mistake['color'], materialLost = false): Mistake {
  return {
    ply: 0,
    moveNumber,
    color,
    fenBefore: '',
    played: '',
    playedUci: '',
    best: null,
    bestUci: null,
    before: 0,
    after: -300,
    loss: 300,
    materialLost,
  }
}

function analysis(mistakes: Mistake[]): GameAnalysis {
  const first = mistakes[0]
  return {
    version: 1,
    depth: 10,
    analyzedAt: 0,
    evals: [],
    mistakes,
    turningPoint: first ? { ply: 0, moveNumber: first.moveNumber, color: first.color } : null,
  }
}

const game = (id: string, color: Game['color'] = 'white') => ({ id, color }) as Game

describe('phaseOf', () => {
  it('découpe la partie en trois phases', () => {
    expect(phaseOf(12)).toBe('opening')
    expect(phaseOf(13)).toBe('middlegame')
    expect(phaseOf(31)).toBe('endgame')
  })
})

describe('engineSummary', () => {
  it('ne compte que les gaffes du joueur', () => {
    const games = [game('a'), game('b'), game('c', 'black'), game('pas-analysée')]
    const analyses = new Map([
      ['a', analysis([mistake(8, 'white', true), mistake(20, 'black'), mistake(25, 'white')])],
      ['b', analysis([])],
      ['c', analysis([mistake(15, 'white'), mistake(40, 'black')])],
    ])
    expect(engineSummary(games, analyses)).toEqual({
      analyzed: 3,
      blundersPerGame: 1, // 2 + 0 + 1 gaffes sur 3 parties
      piecesLostRate: 33,
      medianFirstBlunder: 24, // médiane de 8 et 40
      ownTurningPointRate: 33, // seule la partie « a » bascule sur une erreur du joueur
      byPhase: { opening: 1, middlegame: 1, endgame: 1 },
    })
  })

  it('gère l’absence d’analyse', () => {
    expect(engineSummary([game('a')], new Map())).toMatchObject({
      analyzed: 0,
      blundersPerGame: 0,
      medianFirstBlunder: null,
    })
  })
})

describe('toFrenchSan', () => {
  it('traduit les pièces sans toucher aux colonnes ni au roque', () => {
    expect(toFrenchSan('Nf3')).toBe('Cf3')
    expect(toFrenchSan('Rae8')).toBe('Tae8')
    expect(toFrenchSan('Bxb5+')).toBe('Fxb5+')
    expect(toFrenchSan('exd8=Q#')).toBe('exd8=D#')
    expect(toFrenchSan('O-O-O')).toBe('O-O-O')
    expect(toFrenchSan('Kb1')).toBe('Rb1')
  })
})

describe('formatEval', () => {
  it('affiche des pions avec une décimale', () => {
    expect(formatEval(235)).toBe('+2,4')
    expect(formatEval(-1000)).toBe('-10,0')
    expect(formatEval(0)).toBe('0,0')
  })
})
