import { describe, expect, it } from 'vitest'
import type { Game } from './games'
import type { EarlyMoves } from './indicators'
import { candidateMissions, missionProgress, weekKey, weekStart } from './mission'

let n = 0
function game(overrides: Partial<Game> = {}): Game {
  n++
  return {
    id: `g${n}`,
    url: '',
    pgn: '',
    endTime: n,
    timeClass: 'rapid',
    rated: true,
    color: 'white',
    rating: 1500,
    opponent: 'x',
    opponentRating: 1500,
    outcome: 'win',
    result: 'win',
    eco: null,
    opening: 'Italian Game',
    early: { castleMove: 5, queenMove: null, movesPlayed: 10 },
    ...overrides,
  }
}

const times = <T>(k: number, f: () => T) => Array.from({ length: k }, f)
const ctx = (games: Game[]) => ({ games, analyses: new Map(), puzzles: new Map(), puzzleCount: 0 })
const lateCastle: EarlyMoves = { castleMove: null, queenMove: null, movesPlayed: 10 }

describe('semaine', () => {
  it('commence le lundi', () => {
    const sunday = new Date(2026, 9, 11, 22, 0) // dimanche 11 octobre 2026
    expect(weekStart(sunday)).toEqual(new Date(2026, 9, 5))
    expect(weekKey(sunday)).toBe('2026-10-05')
    expect(weekKey(new Date(2026, 9, 5, 0, 1))).toBe('2026-10-05')
  })
})

describe('candidateMissions', () => {
  it('propose « temps » si la pendule cause beaucoup de défaites', () => {
    const games = [
      ...times(4, () => game({ outcome: 'loss', result: 'timeout' })),
      ...times(4, () => game({ outcome: 'loss', result: 'resigned' })),
    ]
    expect(candidateMissions(ctx(games))[0]).toMatchObject({
      kind: 'no-timeout',
      why: '50 % de tes défaites viennent de la pendule.',
    })
  })

  it('propose le roque si le joueur roque rarement tôt', () => {
    const games = [...times(8, () => game({ early: lateCastle })), ...times(4, () => game())]
    expect(candidateMissions(ctx(games)).map((m) => m.kind)).toEqual(['castle', 'play'])
  })

  it('propose de retravailler une ouverture faible', () => {
    const games = times(6, () =>
      game({
        opening: 'French Defense Advance',
        color: 'black',
        outcome: 'loss',
        result: 'checkmated',
      }),
    )
    const m = candidateMissions(ctx(games)).find((x) => x.kind === 'opening')
    expect(m?.opening).toEqual({ name: 'French Defense', color: 'black' })
  })

  it('propose toujours au moins une mission', () => {
    expect(candidateMissions(ctx([])).map((m) => m.kind)).toEqual(['play'])
  })
})

describe('missionProgress', () => {
  const since = new Date(0)
  it('suit la mission « temps »', () => {
    const ok = times(5, () => game())
    expect(missionProgress({ kind: 'no-timeout' }, ok, new Map(), since)).toMatchObject({
      done: true,
    })
    const ko = [...ok, game({ outcome: 'loss', result: 'timeout' })]
    expect(missionProgress({ kind: 'no-timeout' }, ko, new Map(), since).done).toBe(false)
  })

  it('compte les puzzles résolus depuis lundi seulement', () => {
    const puzzles = new Map([
      ['a', { solved: true, attempts: 1, lastAt: 10 }],
      ['b', { solved: true, attempts: 1, lastAt: 1 }],
      ['c', { solved: false, attempts: 3, lastAt: 10 }],
    ])
    expect(missionProgress({ kind: 'puzzles' }, [], puzzles, new Date(5))).toMatchObject({
      current: 1,
      done: false,
    })
  })

  it('suit une mission d’ouverture', () => {
    const opening = { name: 'French Defense', color: 'black' as const }
    const week = times(5, () => game({ opening: 'French Defense Advance', color: 'black' }))
    expect(missionProgress({ kind: 'opening', opening }, week, new Map(), since)).toMatchObject({
      current: 5,
      done: true,
    })
  })
})
