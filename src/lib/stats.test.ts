import { describe, expect, it } from 'vitest'
import type { Game } from './games'
import {
  lossBreakdown,
  openingFamily,
  openingStats,
  pct,
  ratingSeries,
  ratingSummary,
  ratingTicks,
  recordByColor,
  score,
} from './stats'

let n = 0
function game(overrides: Partial<Game> = {}): Game {
  n++
  return {
    id: `g${n}`,
    url: '',
    pgn: '',
    endTime: n * 1000,
    timeClass: 'rapid',
    rated: true,
    color: 'white',
    rating: 1500,
    opponent: 'x',
    opponentRating: 1500,
    outcome: 'win',
    result: 'win',
    eco: null,
    opening: 'Sicilian Defense Open 2...Nc6',
    ...overrides,
  }
}

describe('pct et score', () => {
  it('gère le dénominateur nul', () => {
    expect(pct(1, 0)).toBe(0)
    expect(score({ win: 0, draw: 0, loss: 0 })).toBe(0)
  })
  it('compte une nulle pour un demi-point', () => {
    expect(score({ win: 1, draw: 2, loss: 1 })).toBe(50)
  })
})

describe('recordByColor', () => {
  it('sépare blancs et noirs', () => {
    const r = recordByColor([
      game({ color: 'white', outcome: 'win' }),
      game({ color: 'white', outcome: 'loss' }),
      game({ color: 'black', outcome: 'draw' }),
    ])
    expect(r.white).toEqual({ win: 1, draw: 0, loss: 1 })
    expect(r.black).toEqual({ win: 0, draw: 1, loss: 0 })
  })
})

describe('courbe d’elo', () => {
  it('ignore les parties amicales et trie par date', () => {
    const s = ratingSeries([
      game({ endTime: 3, rating: 1520 }),
      game({ endTime: 1, rating: 1500 }),
      game({ endTime: 2, rating: 1490, rated: false }),
    ])
    expect(s).toEqual([
      { time: 1, rating: 1500 },
      { time: 3, rating: 1520 },
    ])
    expect(ratingSummary(s)).toEqual({ current: 1520, start: 1500, delta: 20, peak: 1520 })
    expect(ratingSummary([])).toBeNull()
  })

  it('choisit des graduations rondes', () => {
    const pts = (...r: number[]) => r.map((rating, time) => ({ time, rating }))
    expect(ratingTicks(pts(3310, 3500))).toEqual([3300, 3350, 3400, 3450, 3500])
    expect(ratingTicks(pts(1480, 1530))).toEqual([1475, 1500, 1525, 1550])
    expect(ratingTicks(pts(1500, 1500))).toEqual([1500, 1525])
  })
})

describe('openingFamily', () => {
  it.each([
    ['Sicilian Defense Open Scheveningen English Attack with 7 f3...b5', 'Sicilian Defense'],
    ['Queens Gambit Declined Exchange Positional Line...6.e3', 'Queens Gambit Declined'],
    ['Queens Pawn Opening Accelerated London System 2...Nf6', 'Queens Pawn Opening'],
    ['Italian Game Two Knights Defense', 'Italian Game'],
    ['Kings Indian Attack', 'Kings Indian Attack'],
    ['Caro Kann', 'Caro Kann'],
  ])('%s → %s', (name, family) => {
    expect(openingFamily(name)).toBe(family)
  })
  it('gère l’absence de nom', () => {
    expect(openingFamily(null)).toBe('Ouverture inconnue')
  })
})

describe('openingStats', () => {
  it('regroupe par famille et couleur, avec un minimum de parties', () => {
    const games = [
      game({ opening: 'Sicilian Defense Najdorf', outcome: 'win' }),
      game({ opening: 'Sicilian Defense Dragon', outcome: 'loss' }),
      game({ opening: 'Sicilian Defense Open', outcome: 'draw' }),
      game({ opening: 'Sicilian Defense Open', color: 'black' }),
      game({ opening: 'French Defense' }),
    ]
    expect(openingStats(games)).toEqual([
      {
        name: 'Sicilian Defense',
        color: 'white',
        record: { win: 1, draw: 1, loss: 1 },
        games: 3,
        score: 50,
      },
    ])
  })
})

describe('lossBreakdown', () => {
  it('compte les défaites par cause, de la plus fréquente à la moins fréquente', () => {
    const r = lossBreakdown([
      game({ outcome: 'loss', result: 'timeout' }),
      game({ outcome: 'loss', result: 'timeout' }),
      game({ outcome: 'loss', result: 'checkmated' }),
      game({ outcome: 'win', result: 'win' }),
    ])
    expect(r[0]).toEqual({ kind: 'timeout', count: 2 })
    expect(r[1]).toEqual({ kind: 'checkmated', count: 1 })
    expect(r.reduce((s, x) => s + x.count, 0)).toBe(3)
  })
})
