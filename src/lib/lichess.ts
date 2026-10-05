// Import d'une partie dans lichess pour profiter de son analyse gratuite.
// API publique, sans clé : POST https://lichess.org/api/import (doc : https://lichess.org/api#tag/Import)
import type { Color } from './games'

export class LichessError extends Error {
  readonly kind: 'rate-limited' | 'network' | 'http' | 'invalid-data'

  constructor(kind: LichessError['kind'], message: string) {
    super(message)
    this.name = 'LichessError'
    this.kind = kind
  }
}

const ID_PATTERN = /^[a-zA-Z0-9]{8}$/

/** URL d'analyse lichess, échiquier orienté du côté du joueur. */
export function lichessUrl(id: string, color: Color): string {
  return `https://lichess.org/${id}${color === 'black' ? '/black' : ''}`
}

/** Importe un PGN et renvoie l'identifiant de la partie sur lichess. */
export async function importToLichess(pgn: string, fetchFn: typeof fetch = fetch): Promise<string> {
  let res: Response
  try {
    res = await fetchFn('https://lichess.org/api/import', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      // URLSearchParams = encodage application/x-www-form-urlencoded attendu par l'API.
      body: new URLSearchParams({ pgn }),
    })
  } catch {
    throw new LichessError('network', 'Impossible de joindre lichess.')
  }
  if (res.status === 429) {
    throw new LichessError('rate-limited', 'lichess limite les imports : réessaie dans une minute.')
  }
  if (!res.ok) throw new LichessError('http', `Erreur lichess (HTTP ${res.status}).`)

  const data = (await res.json().catch(() => null)) as { id?: unknown } | null
  // On ne fait confiance qu'à un identifiant au format attendu : jamais d'URL arbitraire.
  if (!data || typeof data.id !== 'string' || !ID_PATTERN.test(data.id)) {
    throw new LichessError('invalid-data', 'Réponse inattendue de lichess.')
  }
  return data.id
}
