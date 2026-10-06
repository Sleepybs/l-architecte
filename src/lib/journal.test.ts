import { describe, expect, it } from 'vitest'
import { summarize, today, validateEntry, type JournalEntry } from './journal'

const valid = {
  date: '2026-10-06',
  minutes: 45,
  focus: 'tactics',
  note: '  Fourchettes de cavalier  ',
}

describe('validateEntry', () => {
  it('accepte une saisie correcte et nettoie la note', () => {
    expect(validateEntry(valid, 'id1')).toEqual({
      id: 'id1',
      date: '2026-10-06',
      minutes: 45,
      focus: 'tactics',
      note: 'Fourchettes de cavalier',
    })
  })
  it.each([
    [{ date: '06/10/2026' }, 'Date invalide.'],
    [{ minutes: 0 }, 'Durée entre 1 et 600 minutes.'],
    [{ minutes: 12.5 }, 'Durée entre 1 et 600 minutes.'],
    [{ focus: 'toString' }, 'Choisis un thème.'],
    [{ note: 'x'.repeat(1001) }, 'Note limitée à 1000 caractères.'],
  ])('refuse %o', (patch, message) => {
    expect(validateEntry({ ...valid, ...patch }, 'id')).toBe(message)
  })
})

describe('summarize', () => {
  it('fait le bilan de la semaine', () => {
    const e = (date: string, minutes: number, focus: JournalEntry['focus']): JournalEntry => ({
      id: date + focus,
      date,
      minutes,
      focus,
      note: '',
    })
    const s = summarize(
      [
        e('2026-10-04', 60, 'games'),
        e('2026-10-05', 30, 'tactics'),
        e('2026-10-06', 20, 'tactics'),
      ],
      '2026-10-05',
    )
    expect(s).toEqual({ sessions: 2, minutes: 50, byFocus: { tactics: 50 } })
  })
})

describe('today', () => {
  it('formate la date locale', () => {
    expect(today(new Date(2026, 0, 9))).toBe('2026-01-09')
  })
})
