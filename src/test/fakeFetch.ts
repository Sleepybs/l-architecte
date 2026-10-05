import { vi } from 'vitest'

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers })
}

/** Faux fetch qui répond selon l'URL et vérifie qu'il n'y a jamais deux requêtes en même temps. */
export function fakeFetch(routes: Record<string, () => Response>) {
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
