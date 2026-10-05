import { useCallback, useEffect, useState } from 'react'
import { dbGetByPrefix, dbPut } from '../lib/db'
import type { PuzzleResult } from '../lib/puzzles'

interface Stored extends PuzzleResult {
  id: string
}

const EMPTY: ReadonlyMap<string, PuzzleResult> = new Map()

/** Résultats des puzzles (résolu ou non, nombre d'essais), mémorisés sur l'appareil. */
export function usePuzzleResults(username: string | null) {
  const [store, setStore] = useState<{
    user: string | null
    map: ReadonlyMap<string, PuzzleResult>
  }>({ user: null, map: EMPTY })
  const results = store.user === username ? store.map : EMPTY

  useEffect(() => {
    if (!username) return
    let alive = true
    void dbGetByPrefix<Stored>('kv', `puzzle|${username}|`)
      .catch(() => [])
      .then((list) => {
        if (alive) setStore({ user: username, map: new Map(list.map((r) => [r.id, r])) })
      })
    return () => {
      alive = false
    }
  }, [username])

  const record = useCallback(
    (id: string, solved: boolean) => {
      if (!username) return
      const old = results.get(id)
      const result: PuzzleResult = {
        // Un puzzle résolu le reste, même si on le rate en le refaisant.
        solved: solved || (old?.solved ?? false),
        attempts: (old?.attempts ?? 0) + 1,
        lastAt: Date.now(),
      }
      setStore({ user: username, map: new Map(results).set(id, result) })
      void dbPut<Stored>('kv', `puzzle|${username}|${id}`, { ...result, id }).catch(() => undefined)
    },
    [username, results],
  )

  return { results, record }
}
