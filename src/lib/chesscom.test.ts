import { describe, expect, it, vi } from 'vitest'
import { json, fakeFetch } from '../test/fakeFetch'
import { ChessComError, archiveMonthKey, fetchArchiveList } from './chesscom'

const BASE = 'https://api.chess.com/pub/player/alice/games'

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

describe('archiveMonthKey', () => {
  it('extrait AAAAMM', () => {
    expect(archiveMonthKey(`${BASE}/2026/09`)).toBe(202609)
  })
})
