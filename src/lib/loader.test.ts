import { describe, expect, it } from 'vitest'
import { fakeFetch, json } from '../test/fakeFetch'
import type { ChessComGame } from './chesscom'
import { GAME_VERSION, loadPlayerGames, type CachedMonth, type MonthCache } from './loader'

const BASE = 'https://api.chess.com/pub/player/alice/games'
const NOW = new Date('2026-02-10T12:00:00Z') // le mois en cours est 2026/02

function raw(uuid: string): ChessComGame {
  return {
    uuid,
    url: `https://www.chess.com/game/live/${uuid}`,
    pgn: '1. e4 e5 *',
    end_time: 1,
    time_class: 'rapid',
    time_control: '600',
    rated: true,
    rules: 'chess',
    white: { username: 'alice', rating: 1500, result: 'win' },
    black: { username: 'bob', rating: 1500, result: 'resigned' },
  }
}

const routes = {
  [`${BASE}/archives`]: () =>
    json({ archives: [`${BASE}/2025/12`, `${BASE}/2026/01`, `${BASE}/2026/02`] }),
  [`${BASE}/2025/12`]: () => json({ games: [raw('a')] }),
  [`${BASE}/2026/01`]: () => json({ games: [raw('b')] }),
  [`${BASE}/2026/02`]: () => json({ games: [raw('c'), raw('d')] }),
}

function memoryCache(): MonthCache & { data: Map<string, CachedMonth> } {
  const data = new Map<string, CachedMonth>()
  return {
    data,
    get: async (u, url) => data.get(`${u}|${url}`),
    put: async (u, url, m) => void data.set(`${u}|${url}`, m),
    all: async (u) => [...data].filter(([k]) => k.startsWith(`${u}|`)).map(([, v]) => v),
  }
}

describe('loadPlayerGames', () => {
  it('télécharge les mois un par un, jamais en parallèle', async () => {
    const f = fakeFetch(routes)
    const progress: string[] = []
    const r = await loadPlayerGames('alice', {
      fetchFn: f.fn,
      cache: memoryCache(),
      now: NOW,
      onProgress: (p) => progress.push(`${p.done}/${p.total}:${p.source}`),
    })
    expect(r.games.map((g) => g.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(r.downloaded).toBe(3)
    expect(f.maxInFlight()).toBe(1)
    expect(progress).toEqual(['1/3:network', '2/3:network', '3/3:network'])
  })

  it('ne télécharge que les mois de la période demandée', async () => {
    const f = fakeFetch(routes)
    await loadPlayerGames('alice', {
      fetchFn: f.fn,
      cache: memoryCache(),
      now: NOW,
      since: new Date('2026-01-15T00:00:00Z'),
    })
    expect(f.calls).toEqual([`${BASE}/archives`, `${BASE}/2026/01`, `${BASE}/2026/02`])
  })

  it('réutilise les mois terminés et recharge seulement le mois en cours', async () => {
    const cache = memoryCache()
    await loadPlayerGames('alice', { fetchFn: fakeFetch(routes).fn, cache, now: NOW })
    expect(cache.data.get(`alice|${BASE}/2026/01`)?.complete).toBe(true)
    expect(cache.data.get(`alice|${BASE}/2026/02`)?.complete).toBe(false)

    const f = fakeFetch(routes)
    const r = await loadPlayerGames('alice', { fetchFn: f.fn, cache, now: NOW })
    expect(f.calls).toEqual([`${BASE}/archives`, `${BASE}/2026/02`])
    expect(r.downloaded).toBe(1)
    expect(r.games).toHaveLength(4)
  })

  it('recalcule un mois mis en cache par une ancienne version', async () => {
    const cache = memoryCache()
    await cache.put('alice', `${BASE}/2025/12`, {
      version: GAME_VERSION - 1,
      monthKey: 202512,
      complete: true,
      fetchedAt: 0,
      games: [],
    })
    const f = fakeFetch(routes)
    await loadPlayerGames('alice', { fetchFn: f.fn, cache, now: NOW })
    expect(f.calls).toContain(`${BASE}/2025/12`)
  })

  it('hors ligne, affiche les données en cache', async () => {
    const cache = memoryCache()
    await loadPlayerGames('alice', { fetchFn: fakeFetch(routes).fn, cache, now: NOW })
    const offlineFetch = (async () => {
      throw new TypeError('Failed to fetch')
    }) as typeof fetch
    const r = await loadPlayerGames('alice', { fetchFn: offlineFetch, cache, now: NOW })
    expect(r.offline).toBe(true)
    expect(r.games).toHaveLength(4)
  })

  it('hors ligne sans cache, remonte l’erreur', async () => {
    const offlineFetch = (async () => {
      throw new TypeError('Failed to fetch')
    }) as typeof fetch
    await expect(
      loadPlayerGames('alice', { fetchFn: offlineFetch, cache: memoryCache(), now: NOW }),
    ).rejects.toMatchObject({ kind: 'network' })
  })
})
