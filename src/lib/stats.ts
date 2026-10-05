// Statistiques du tableau de bord : fonctions pures, faciles à tester.
import type { Color, Game } from './games'

export interface Record3 {
  win: number
  draw: number
  loss: number
}

export function total(r: Record3): number {
  return r.win + r.draw + r.loss
}

/** Pourcentage arrondi à l'unité (0 si dénominateur nul). */
export function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100)
}

/** Score « échecs » : victoire = 1, nulle = ½. Plus juste que le seul % de victoires. */
export function score(r: Record3): number {
  const n = total(r)
  return n === 0 ? 0 : Math.round(((r.win + r.draw / 2) / n) * 100)
}

export function recordOf(games: readonly Game[]): Record3 {
  const r: Record3 = { win: 0, draw: 0, loss: 0 }
  for (const g of games) r[g.outcome]++
  return r
}

export function recordByColor(games: readonly Game[]): Record<Color, Record3> {
  return {
    white: recordOf(games.filter((g) => g.color === 'white')),
    black: recordOf(games.filter((g) => g.color === 'black')),
  }
}

export interface RatingPoint {
  time: number
  rating: number
}

/** Courbe d'elo : uniquement les parties classées, dans l'ordre chronologique. */
export function ratingSeries(games: readonly Game[]): RatingPoint[] {
  return games
    .filter((g) => g.rated)
    .map((g) => ({ time: g.endTime, rating: g.rating }))
    .sort((a, b) => a.time - b.time)
}

export interface RatingSummary {
  current: number
  start: number
  delta: number
  peak: number
}

export function ratingSummary(series: readonly RatingPoint[]): RatingSummary | null {
  const first = series[0]
  const last = series[series.length - 1]
  if (!first || !last) return null
  return {
    current: last.rating,
    start: first.rating,
    delta: last.rating - first.rating,
    peak: Math.max(...series.map((p) => p.rating)),
  }
}

/** Graduations « rondes » (pas de 25, 50, 100 ou 200 points) couvrant toute la courbe. */
export function ratingTicks(series: readonly RatingPoint[]): number[] {
  const values = series.map((p) => p.rating)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const step = [25, 50, 100, 200, 500].find((s) => (hi - lo) / s <= 5) ?? 1000
  const start = Math.floor(lo / step) * step
  const end = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let t = start; t <= end; t += step) ticks.push(t)
  if (ticks.length < 2) ticks.push(start + step)
  return ticks
}

// Mots qui terminent le nom « principal » d'une ouverture chez chess.com.
const FAMILY_END = new Set(['Defense', 'Opening', 'Game', 'Gambit', 'Attack', 'System'])
const FAMILY_SUFFIX = new Set(['Accepted', 'Declined', 'Refused'])

/**
 * Regroupe les variantes d'une même ouverture :
 * « Sicilian Defense Open Scheveningen 7.f3 » → « Sicilian Defense »,
 * « Queens Gambit Declined Exchange » → « Queens Gambit Declined ».
 */
export function openingFamily(name: string | null): string {
  if (!name) return 'Ouverture inconnue'
  const words = name.split(/\s+/).filter((w) => !/\d/.test(w))
  const out: string[] = []
  for (const [i, w] of words.entries()) {
    out.push(w)
    if (FAMILY_END.has(w)) {
      const next = words[i + 1]
      if (next && FAMILY_SUFFIX.has(next)) out.push(next)
      break
    }
  }
  return out.join(' ') || 'Ouverture inconnue'
}

export interface OpeningStat {
  name: string
  color: Color
  record: Record3
  games: number
  score: number
}

/** Ouvertures regroupées par famille ET par couleur (on ne joue pas la même chose avec les noirs). */
export function openingStats(games: readonly Game[], minGames = 3): OpeningStat[] {
  const groups = new Map<string, { name: string; color: Color; games: Game[] }>()
  for (const g of games) {
    const name = openingFamily(g.opening)
    const key = `${g.color}|${name}`
    const group = groups.get(key) ?? { name, color: g.color, games: [] }
    group.games.push(g)
    groups.set(key, group)
  }
  return [...groups.values()]
    .filter((x) => x.games.length >= minGames)
    .map((x) => {
      const record = recordOf(x.games)
      return { name: x.name, color: x.color, record, games: x.games.length, score: score(record) }
    })
    .sort((a, b) => b.games - a.games || b.score - a.score)
}

export type LossKind = 'checkmated' | 'resigned' | 'timeout' | 'abandoned'

export const LOSS_LABELS: Record<LossKind, string> = {
  checkmated: 'Échec et mat',
  resigned: 'Abandon',
  timeout: 'Temps écoulé',
  abandoned: 'Partie quittée',
}

/** Comment les défaites arrivent : mat, abandon, temps, partie quittée. */
export function lossBreakdown(games: readonly Game[]): { kind: LossKind; count: number }[] {
  const counts: Record<LossKind, number> = { checkmated: 0, resigned: 0, timeout: 0, abandoned: 0 }
  for (const g of games) {
    if (g.outcome === 'loss' && g.result in counts) counts[g.result as LossKind]++
  }
  return (Object.keys(counts) as LossKind[])
    .map((kind) => ({ kind, count: counts[kind] }))
    .sort((a, b) => b.count - a.count)
}
