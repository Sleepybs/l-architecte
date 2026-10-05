// Client de l'API publique officielle chess.com (lecture seule, sans compte).
// Doc : https://www.chess.com/news/view/published-data-api
// Règles respectées : requêtes séquentielles (jamais en parallèle) et attente sur 429.

const API = 'https://api.chess.com/pub'

export type ChessComErrorKind = 'not-found' | 'rate-limited' | 'network' | 'http' | 'invalid-data'

export class ChessComError extends Error {
  readonly kind: ChessComErrorKind

  constructor(kind: ChessComErrorKind, message: string) {
    super(message)
    this.name = 'ChessComError'
    this.kind = kind
  }
}

/** Forme brute d'une partie renvoyée par l'API (seuls les champs utilisés). */
export interface ChessComPlayer {
  username: string
  rating: number
  result: string
}

export interface ChessComGame {
  url: string
  uuid: string
  pgn?: string
  end_time: number
  time_class: string
  time_control: string
  rated: boolean
  rules: string
  eco?: string
  white: ChessComPlayer
  black: ChessComPlayer
}

export interface FetchOptions {
  signal?: AbortSignal
  /** Nombre maximal de nouvelles tentatives après un 429. */
  maxRetries?: number
  /** Appelé quand on attend à cause d'un 429 (pour l'afficher à l'utilisateur). */
  onRateLimit?: (waitMs: number) => void
  /** Injectables pour les tests. */
  fetchFn?: typeof fetch
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>
}

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
}

/** Délai d'attente après un 429 : l'en-tête Retry-After s'il existe, sinon 2 s, 4 s, 8 s… */
function retryDelay(res: Response, attempt: number): number {
  const header = Number(res.headers.get('Retry-After'))
  if (Number.isFinite(header) && header > 0) return Math.min(header, 60) * 1000
  return 2000 * 2 ** attempt
}

async function getJson(url: string, opts: FetchOptions): Promise<unknown> {
  const fetchFn = opts.fetchFn ?? fetch
  const sleep = opts.sleep ?? defaultSleep
  const maxRetries = opts.maxRetries ?? 4

  for (let attempt = 0; ; attempt++) {
    let res: Response
    try {
      res = await fetchFn(url, { signal: opts.signal, headers: { Accept: 'application/json' } })
    } catch (err) {
      if (opts.signal?.aborted) throw err
      throw new ChessComError('network', 'Impossible de joindre chess.com (réseau ou blocage).')
    }

    if (res.status === 429) {
      if (attempt >= maxRetries) {
        throw new ChessComError(
          'rate-limited',
          'chess.com limite les requêtes. Réessaie plus tard.',
        )
      }
      const wait = retryDelay(res, attempt)
      opts.onRateLimit?.(wait)
      await sleep(wait, opts.signal)
      continue
    }
    if (res.status === 404)
      throw new ChessComError('not-found', 'Joueur introuvable sur chess.com.')
    if (!res.ok) throw new ChessComError('http', `Erreur chess.com (HTTP ${res.status}).`)

    try {
      return await res.json()
    } catch {
      throw new ChessComError('invalid-data', 'Réponse inattendue de chess.com.')
    }
  }
}

function playerBase(username: string): string {
  return `${API}/player/${encodeURIComponent(username)}/games/`
}

/** Liste des archives mensuelles (une URL par mois où le joueur a joué). */
export async function fetchArchiveList(
  username: string,
  opts: FetchOptions = {},
): Promise<string[]> {
  const data = await getJson(`${playerBase(username)}archives`, opts)
  const archives = (data as { archives?: unknown }).archives
  if (!Array.isArray(archives))
    throw new ChessComError('invalid-data', 'Liste d’archives invalide.')

  // Défense en profondeur : on ne suit que des URL qui pointent bien vers
  // les archives de CE joueur sur l'API, au format .../games/AAAA/MM.
  const base = playerBase(username)
  return archives.filter(
    (u): u is string =>
      typeof u === 'string' &&
      u.toLowerCase().startsWith(base.toLowerCase()) &&
      /\/\d{4}\/\d{2}$/.test(u),
  )
}

/** Mois (AAAA/MM) d'une URL d'archive, sous forme comparable : 202609. */
export function archiveMonthKey(url: string): number {
  const m = /\/(\d{4})\/(\d{2})$/.exec(url)
  return m ? Number(m[1]) * 100 + Number(m[2]) : 0
}

export async function fetchMonth(
  archiveUrl: string,
  opts: FetchOptions = {},
): Promise<ChessComGame[]> {
  const data = await getJson(archiveUrl, opts)
  const games = (data as { games?: unknown }).games
  if (!Array.isArray(games)) throw new ChessComError('invalid-data', 'Archive mensuelle invalide.')
  return games as ChessComGame[]
}
