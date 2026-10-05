import { describe, expect, it, vi } from 'vitest'
import { importToLichess, lichessUrl } from './lichess'

function fakeFetch(status: number, body: unknown) {
  return vi.fn(
    async () => new Response(JSON.stringify(body), { status }),
  ) as unknown as typeof fetch
}

describe('importToLichess', () => {
  it('envoie le PGN encodé en formulaire et renvoie l’identifiant', async () => {
    const fetchFn = fakeFetch(200, { id: 'oo7AeJKM', url: 'https://lichess.org/oo7AeJKM' })
    expect(await importToLichess('1. e4 e5 *', fetchFn)).toBe('oo7AeJKM')
    const [url, init] = vi.mocked(fetchFn).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://lichess.org/api/import')
    expect(init.method).toBe('POST')
    expect(String(init.body)).toBe('pgn=1.+e4+e5+*')
  })

  it('refuse un identifiant douteux', async () => {
    await expect(importToLichess('x', fakeFetch(200, { id: '../evil' }))).rejects.toMatchObject({
      kind: 'invalid-data',
    })
  })

  it('signale la limite de débit', async () => {
    await expect(importToLichess('x', fakeFetch(429, {}))).rejects.toMatchObject({
      kind: 'rate-limited',
    })
  })
})

describe('lichessUrl', () => {
  it('oriente l’échiquier du côté du joueur', () => {
    expect(lichessUrl('abcdEFGH', 'white')).toBe('https://lichess.org/abcdEFGH')
    expect(lichessUrl('abcdEFGH', 'black')).toBe('https://lichess.org/abcdEFGH/black')
  })
})
