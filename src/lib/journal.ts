// Journal de séance : ce que tu as travaillé, combien de temps, ce que tu en retiens.

export const FOCUSES = {
  games: 'Parties',
  tactics: 'Tactique',
  openings: 'Ouvertures',
  endgames: 'Finales',
  review: 'Analyse de mes parties',
} as const
export type Focus = keyof typeof FOCUSES

export interface JournalEntry {
  id: string
  /** Jour de la séance (AAAA-MM-JJ). */
  date: string
  minutes: number
  focus: Focus
  note: string
}

export const NOTE_MAX = 1000

export interface EntryInput {
  date: string
  minutes: number
  focus: string
  note: string
}

/** Valide une saisie ; renvoie l'entrée prête à stocker ou un message d'erreur. */
export function validateEntry(input: EntryInput, id: string): JournalEntry | string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(input.date))) {
    return 'Date invalide.'
  }
  if (!Number.isInteger(input.minutes) || input.minutes < 1 || input.minutes > 600) {
    return 'Durée entre 1 et 600 minutes.'
  }
  // Object.hasOwn et non « in » : « 'toString' in FOCUSES » vaut true (propriété héritée).
  if (!Object.hasOwn(FOCUSES, input.focus)) return 'Choisis un thème.'
  const note = input.note.trim()
  if (note.length > NOTE_MAX) return `Note limitée à ${NOTE_MAX} caractères.`
  return { id, date: input.date, minutes: input.minutes, focus: input.focus as Focus, note }
}

export interface WeekSummary {
  sessions: number
  minutes: number
  byFocus: Partial<Record<Focus, number>>
}

/** Bilan des séances depuis `since` (AAAA-MM-JJ, inclus). */
export function summarize(entries: readonly JournalEntry[], since: string): WeekSummary {
  const week = entries.filter((e) => e.date >= since)
  const byFocus: Partial<Record<Focus, number>> = {}
  for (const e of week) byFocus[e.focus] = (byFocus[e.focus] ?? 0) + e.minutes
  return {
    sessions: week.length,
    minutes: week.reduce((s, e) => s + e.minutes, 0),
    byFocus,
  }
}

/** Date du jour au format AAAA-MM-JJ, en heure locale. */
export function today(now = new Date()): string {
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}
