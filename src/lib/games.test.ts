import { describe, expect, it } from 'vitest'
import type { ChessComGame } from './chesscom'
import { filterGames, openingFromUrl, outcomeOf, toGame } from './games'
import { normalizeUsername } from './username'

function raw(overrides: Partial<ChessComGame> = {}): ChessComGame {
  return {
    url: 'https://www.chess.com/game/live/1',
    uuid: 'u1',
    pgn: '[ECO "B22"]\n[ECOUrl "https://www.chess.com/openings/Alapin-Sicilian-Defense-2...Qa5"]\n\n1. e4 c5',
    end_time: 1_788_880_073,
    time_class: 'rapid',
    time_control: '600',
    rated: true,
    rules: 'chess',
    white: { username: 'Alice', rating: 1500, result: 'win' },
    black: { username: 'bob', rating: 1480, result: 'resigned' },
    ...overrides,
  }
}

/** Version de toGame qui échoue explicitement si la partie est rejetée. */
function game(r: ChessComGame) {
  const g = toGame(r, 'alice')
  if (!g) throw new Error('partie rejetée')
  return g
}

describe('toGame', () => {
  it('voit la partie du côté du joueur, sans tenir compte de la casse', () => {
    const g = toGame(raw(), 'alice')
    expect(g).toMatchObject({
      color: 'white',
      rating: 1500,
      opponent: 'bob',
      outcome: 'win',
      eco: 'B22',
      opening: 'Alapin Sicilian Defense 2...Qa5',
      endTime: 1_788_880_073_000,
    })
    expect(toGame(raw(), 'BOB')).toMatchObject({
      color: 'black',
      outcome: 'loss',
      result: 'resigned',
    })
  })

  it('ignore les variantes et les parties où le joueur n’apparaît pas', () => {
    expect(toGame(raw({ rules: 'chess960' }), 'alice')).toBeNull()
    expect(toGame(raw(), 'carol')).toBeNull()
  })
})

describe('outcomeOf', () => {
  it('classe les codes chess.com', () => {
    expect(outcomeOf('win')).toBe('win')
    expect(outcomeOf('repetition')).toBe('draw')
    expect(outcomeOf('timevsinsufficient')).toBe('draw')
    expect(outcomeOf('checkmated')).toBe('loss')
    expect(outcomeOf('timeout')).toBe('loss')
    expect(outcomeOf('abandoned')).toBe('loss')
  })
})

describe('filterGames', () => {
  it('filtre par cadence et par date, du plus ancien au plus récent', () => {
    const a = game(raw({ uuid: 'a', end_time: 300 }))
    const b = game(raw({ uuid: 'b', end_time: 100 }))
    const c = game(raw({ uuid: 'c', time_class: 'blitz' }))
    const old = game(raw({ uuid: 'old', end_time: 10 }))
    const result = filterGames([a, b, c, old], { timeClass: 'rapid', since: new Date(50_000) })
    expect(result.map((g) => g.id)).toEqual(['b', 'a'])
  })
})

describe('openingFromUrl', () => {
  it('gère les valeurs absentes', () => {
    expect(openingFromUrl(undefined)).toBeNull()
    expect(openingFromUrl('https://www.chess.com/openings/Catalan-Opening-7.O-O-O-Nc6')).toBe(
      'Catalan Opening 7.O-O-O Nc6',
    )
    expect(openingFromUrl('https://www.chess.com/game/1')).toBeNull()
  })
})

describe('normalizeUsername', () => {
  it('accepte les pseudos valides et les met en minuscules', () => {
    expect(normalizeUsername('  Hikaru ')).toBe('hikaru')
    expect(normalizeUsername('a_b-c9')).toBe('a_b-c9')
  })
  it('refuse le reste', () => {
    for (const bad of ['ab', 'a'.repeat(26), 'foo bar', '../x', '<script>', 'é_lève']) {
      expect(normalizeUsername(bad)).toBeNull()
    }
  })
})
