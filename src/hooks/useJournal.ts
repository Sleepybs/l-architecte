import { useCallback, useEffect, useState } from 'react'
import { dbDelete, dbGetByPrefix, dbPut } from '../lib/db'
import { validateEntry, type EntryInput, type JournalEntry } from '../lib/journal'

const EMPTY: readonly JournalEntry[] = []

/** Journal de séance d'un joueur, stocké sur l'appareil. */
export function useJournal(username: string | null) {
  const [store, setStore] = useState<{ user: string | null; entries: readonly JournalEntry[] }>({
    user: null,
    entries: EMPTY,
  })
  const entries = store.user === username ? store.entries : EMPTY

  useEffect(() => {
    if (!username) return
    let alive = true
    void dbGetByPrefix<JournalEntry>('journal', `${username}|`)
      .catch(() => [])
      .then((list) => {
        // Chaque entrée relue est revalidée : on ne fait jamais confiance au stockage.
        const valid = list.flatMap((e) => {
          const v = validateEntry(e, String(e.id))
          return typeof v === 'string' ? [] : [v]
        })
        if (alive) setStore({ user: username, entries: sortEntries(valid) })
      })
    return () => {
      alive = false
    }
  }, [username])

  const add = useCallback(
    async (input: EntryInput): Promise<string | null> => {
      if (!username) return 'Charge d’abord un joueur.'
      const entry = validateEntry(input, `${Date.now()}`)
      if (typeof entry === 'string') return entry
      await dbPut('journal', `${username}|${entry.id}`, entry).catch(() => undefined)
      setStore({ user: username, entries: sortEntries([...entries, entry]) })
      return null
    },
    [username, entries],
  )

  const remove = useCallback(
    async (id: string) => {
      if (!username) return
      await dbDelete('journal', `${username}|${id}`).catch(() => undefined)
      setStore({ user: username, entries: entries.filter((e) => e.id !== id) })
    },
    [username, entries],
  )

  return { entries, add, remove }
}

function sortEntries(list: JournalEntry[]): JournalEntry[] {
  return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
}
