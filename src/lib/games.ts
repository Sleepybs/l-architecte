// Transforme les parties brutes de l'API en un modèle simple, vu du côté du joueur.
import type { ChessComGame } from './chesscom'
import { earlyMoves, type EarlyMoves } from './indicators'

export type TimeClass = 'rapid' | 'blitz' | 'daily' | 'bullet'
export type Color = 'white' | 'black'
export type Outcome = 'win' | 'loss' | 'draw'

export interface Game {
  id: string
  url: string
  pgn: string
  endTime: number // millisecondes
  timeClass: TimeClass
  rated: boolean
  color: Color
  rating: number
  opponent: string
  opponentRating: number
  outcome: Outcome
  /** Code brut chess.com du joueur : win, checkmated, resigned, timeout, agreed… */
  result: string
  eco: string | null
  opening: string | null
  /** Roque et sortie de dame dans les 10 premiers coups (null si le PGN est illisible). */
  early: EarlyMoves | null
}

// Codes de résultat chess.com qui signifient « nulle ».
const DRAW_RESULTS = new Set([
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'timevsinsufficient',
])

const TIME_CLASSES: readonly string[] = ['rapid', 'blitz', 'daily', 'bullet']

export function outcomeOf(result: string): Outcome {
  if (result === 'win') return 'win'
  if (DRAW_RESULTS.has(result)) return 'draw'
  return 'loss'
}

function pgnTag(pgn: string, tag: string): string | null {
  const m = new RegExp(`^\\[${tag} "([^"]*)"\\]`, 'm').exec(pgn)
  return m?.[1] ?? null
}

/** Nom lisible de l'ouverture à partir de l'URL chess.com (…/openings/Sicilian-Defense-2...Nc6). */
export function openingFromUrl(url: string | undefined | null): string | null {
  if (!url) return null
  const slug = url.split('/openings/')[1]
  if (!slug) return null
  try {
    // Les tirets séparent les mots, sauf dans la notation du roque (O-O, O-O-O).
    const text = decodeURIComponent(slug).replace(/(?<!O)-|-(?!O)/g, ' ')
    return text.trim() || null
  } catch {
    return null
  }
}

/** Convertit une partie brute ; renvoie null si elle n'est pas exploitable (variante, joueur absent…). */
export function toGame(raw: ChessComGame, username: string): Game | null {
  if (raw.rules !== 'chess' || !TIME_CLASSES.includes(raw.time_class)) return null

  const me = username.toLowerCase()
  let color: Color
  if (raw.white?.username?.toLowerCase() === me) color = 'white'
  else if (raw.black?.username?.toLowerCase() === me) color = 'black'
  else return null

  const mine = raw[color]
  const theirs = raw[color === 'white' ? 'black' : 'white']
  const pgn = raw.pgn ?? ''

  return {
    id: raw.uuid || raw.url,
    url: raw.url,
    pgn,
    endTime: raw.end_time * 1000,
    timeClass: raw.time_class as TimeClass,
    rated: raw.rated,
    color,
    rating: mine.rating,
    opponent: theirs.username,
    opponentRating: theirs.rating,
    outcome: outcomeOf(mine.result),
    result: mine.result,
    eco: pgnTag(pgn, 'ECO'),
    opening: openingFromUrl(pgnTag(pgn, 'ECOUrl') ?? raw.eco),
    early: pgn ? earlyMoves(pgn, color) : null,
  }
}

/**
 * Convertit beaucoup de parties sans figer l'interface : on rend la main
 * au navigateur tous les `chunk` éléments (le rejeu chess.js coûte ~1 ms par partie).
 */
export async function toGames(
  raws: readonly ChessComGame[],
  username: string,
  onProgress?: (done: number, total: number) => void,
  chunk = 150,
): Promise<Game[]> {
  const out: Game[] = []
  for (let i = 0; i < raws.length; i += chunk) {
    for (const raw of raws.slice(i, i + chunk)) {
      const g = toGame(raw, username)
      if (g) out.push(g)
    }
    onProgress?.(Math.min(i + chunk, raws.length), raws.length)
    await new Promise((r) => setTimeout(r, 0))
  }
  return out
}

export interface GameFilter {
  timeClass: TimeClass
  /** Ne garder que les parties terminées après cette date. Absent = tout. */
  since?: Date
}

export function filterGames(games: readonly Game[], filter: GameFilter): Game[] {
  const min = filter.since?.getTime() ?? 0
  return games
    .filter((g) => g.timeClass === filter.timeClass && g.endTime >= min)
    .sort((a, b) => a.endTime - b.endTime)
}

/** Périodes proposées dans l'interface, en jours (null = tout l'historique). */
export const PERIODS = [
  { label: '30 derniers jours', days: 30 },
  { label: '3 derniers mois', days: 90 },
  { label: '6 derniers mois', days: 182 },
  { label: '12 derniers mois', days: 365 },
  { label: 'Tout l’historique', days: null },
] as const

export function sinceDate(days: number | null, now = new Date()): Date | undefined {
  return days === null ? undefined : new Date(now.getTime() - days * 86_400_000)
}
