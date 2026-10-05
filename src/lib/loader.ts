// Chargement des parties d'un joueur avec cache local.
// Un mois terminé ne change plus : une fois téléchargé, on ne le redemande jamais.
// Seuls la liste des archives et le mois en cours sont rechargés à chaque fois.
import {
  archiveMonthKey,
  ChessComError,
  fetchArchiveList,
  fetchMonth,
  type FetchOptions,
} from './chesscom'
import { dbGetByPrefix, dbGet, dbPut } from './db'
import { toGames, type Game } from './games'

/** À incrémenter si la transformation des parties change (le cache sera alors recalculé). */
export const GAME_VERSION = 1

export interface CachedMonth {
  version: number
  monthKey: number
  /** true si le mois était déjà terminé au téléchargement (donc définitif). */
  complete: boolean
  fetchedAt: number
  games: Game[]
}

export interface MonthCache {
  get(username: string, url: string): Promise<CachedMonth | undefined>
  put(username: string, url: string, month: CachedMonth): Promise<void>
  /** Tous les mois en cache pour ce joueur (mode hors ligne). */
  all(username: string): Promise<CachedMonth[]>
}

const key = (username: string, url: string) => `${username}|${url}`

/** Cache IndexedDB. Si IndexedDB est indisponible (navigation privée…), l'app marche sans cache. */
export const idbMonthCache: MonthCache = {
  get: (u, url) => dbGet<CachedMonth>('months', key(u, url)).catch(() => undefined),
  put: (u, url, m) => dbPut('months', key(u, url), m).catch(() => undefined),
  all: (u) => dbGetByPrefix<CachedMonth>('months', `${u}|`).catch(() => []),
}

export function monthKeyOf(date: Date): number {
  return date.getUTCFullYear() * 100 + date.getUTCMonth() + 1
}

export interface LoadProgress {
  done: number
  total: number
  /** Le dernier mois vient-il du cache ou du réseau ? */
  source: 'cache' | 'network'
}

export interface LoadOptions extends FetchOptions {
  since?: Date
  cache?: MonthCache
  now?: Date
  onProgress?: (p: LoadProgress) => void
}

export interface LoadResult {
  games: Game[]
  /** Nombre de mois téléchargés (les autres venaient du cache). */
  downloaded: number
  /** true si chess.com était injoignable et que seules les données en cache sont affichées. */
  offline: boolean
}

export async function loadPlayerGames(
  username: string,
  opts: LoadOptions = {},
): Promise<LoadResult> {
  const cache = opts.cache ?? idbMonthCache
  const nowKey = monthKeyOf(opts.now ?? new Date())
  const minKey = opts.since ? monthKeyOf(opts.since) : 0

  let archives: string[]
  try {
    archives = await fetchArchiveList(username, opts)
  } catch (err) {
    // Hors ligne : on se rabat sur le cache s'il existe.
    if (err instanceof ChessComError && err.kind === 'network') {
      const cached = (await cache.all(username)).filter(
        (m) => m.version === GAME_VERSION && m.monthKey >= minKey,
      )
      if (cached.length > 0) {
        return { games: cached.flatMap((m) => m.games), downloaded: 0, offline: true }
      }
    }
    throw err
  }
  archives = archives.filter((u) => archiveMonthKey(u) >= minKey)

  const games: Game[] = []
  let downloaded = 0
  for (const [i, url] of archives.entries()) {
    const monthKey = archiveMonthKey(url)
    const cached = await cache.get(username, url)
    let source: LoadProgress['source'] = 'cache'

    if (cached && cached.version === GAME_VERSION && cached.complete) {
      games.push(...cached.games)
    } else {
      const raw = await fetchMonth(url, opts)
      const monthGames = await toGames(raw, username)
      await cache.put(username, url, {
        version: GAME_VERSION,
        monthKey,
        complete: monthKey < nowKey,
        fetchedAt: Date.now(),
        games: monthGames,
      })
      games.push(...monthGames)
      downloaded++
      source = 'network'
    }
    opts.onProgress?.({ done: i + 1, total: archives.length, source })
  }
  return { games, downloaded, offline: false }
}
