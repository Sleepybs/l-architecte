import { describe, expect, it, vi } from 'vitest'
import { ChessComError, archiveMonthKey, fetchArchiveList, fetchGames } from './chesscom'

const BASE = 'https://api.chess.com/pub/player/alice/games'

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers })
}

/** Faux fetch qui répond selon l'URL et vérifie qu'il n'y a jamais deux requêtes en même temps. */
function fakeFetch(routes: Record<string, () => Response>) {
  let inFlight = 0
  let maxInFlight = 0
  const calls: string[] = []
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    calls.push(url)
    inFlight++
    maxInFlight = Math.max(maxInFlight, inFlight)
    await Promise.resolve()
    inFlight--
    const route = routes[url]
    return route ? route() : json({}, 404)
  })
  return { fn: fn as unknown as typeof fetch, calls, maxInFlight: () => maxInFlight }
}

const noSleep = () => Promise.resolve()

describe('fetchArchiveList', () => {
  it('ignore les URL qui ne sont pas des archives du joueur', async () => {
    const { fn } = fakeFetch({
      [`${BASE}/archives`]: () =>
        json({
          archives: [
            `${BASE}/2026/08`,
            'https://evil.example/pub/player/alice/games/2026/09',
            `${BASE}/../../bob/games/2026/09/extra`,
            42,
          ],
        }),
    })
    expect(await fetchArchiveList('alice', { fetchFn: fn })).toEqual([`${BASE}/2026/08`])
  })

  it('encode le pseudo dans l’URL', async () => {
    const { fn, calls } = fakeFetch({})
    await expect(fetchArchiveList('a/b?c', { fetchFn: fn })).rejects.toThrow()
    expect(calls[0]).toBe('https://api.chess.com/pub/player/a%2Fb%3Fc/games/archives')
  })

  it('signale un joueur introuvable (404)', async () => {
    const { fn } = fakeFetch({})
    await expect(fetchArchiveList('alice', { fetchFn: fn })).rejects.toMatchObject({
      kind: 'not-found',
    })
  })
})

describe('gestion du 429', () => {
  it('attend puis réessaie, en respectant Retry-After', async () => {
    let n = 0
    const { fn } = fakeFetch({
      [`${BASE}/archives`]: () =>
        n++ === 0 ? json({}, 429, { 'Retry-After': '3' }) : json({ archives: [] }),
    })
    const sleep = vi.fn(noSleep)
    const onRateLimit = vi.fn()
    await fetchArchiveList('alice', { fetchFn: fn, sleep, onRateLimit })
    expect(sleep).toHaveBeenCalledWith(3000, undefined)
    expect(onRateLimit).toHaveBeenCalledWith(3000)
  })

  it('abandonne après le nombre maximal de tentatives', async () => {
    const { fn, calls } = fakeFetch({ [`${BASE}/archives`]: () => json({}, 429) })
    const err = await fetchArchiveList('alice', {
      fetchFn: fn,
      sleep: noSleep,
      maxRetries: 2,
    }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ChessComError)
    expect((err as ChessComError).kind).toBe('rate-limited')
    expect(calls).toHaveLength(3)
  })
})

describe('fetchGames', () => {
  const routes = {
    [`${BASE}/archives`]: () =>
      json({ archives: [`${BASE}/2025/12`, `${BASE}/2026/01`, `${BASE}/2026/02`] }),
    [`${BASE}/2025/12`]: () => json({ games: [{ uuid: 'a' }] }),
    [`${BASE}/2026/01`]: () => json({ games: [{ uuid: 'b' }] }),
    [`${BASE}/2026/02`]: () => json({ games: [{ uuid: 'c' }, { uuid: 'd' }] }),
  }

  it('télécharge les mois un par un, jamais en parallèle', async () => {
    const f = fakeFetch(routes)
    const progress: number[] = []
    const games = await fetchGames('alice', { fetchFn: f.fn, onProgress: (d) => progress.push(d) })
    expect(games.map((g) => g.uuid)).toEqual(['a', 'b', 'c', 'd'])
    expect(f.maxInFlight()).toBe(1)
    expect(progress).toEqual([0, 1, 2, 3])
  })

  it('ne télécharge que les mois de la période demandée', async () => {
    const f = fakeFetch(routes)
    await fetchGames('alice', { fetchFn: f.fn, since: new Date('2026-01-15T00:00:00Z') })
    expect(f.calls).toEqual([`${BASE}/archives`, `${BASE}/2026/01`, `${BASE}/2026/02`])
  })
})

describe('archiveMonthKey', () => {
  it('extrait AAAAMM', () => {
    expect(archiveMonthKey(`${BASE}/2026/09`)).toBe(202609)
  })
})
