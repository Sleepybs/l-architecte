import { useCallback, useEffect, useRef, useState } from 'react'
import { ChessComError } from '../lib/chesscom'
import type { Game } from '../lib/games'
import { loadPlayerGames } from '../lib/loader'

export type LoadState =
  | { status: 'idle' }
  | { status: 'loading'; done: number; total: number; fromCache: number; waitMs: number | null }
  | { status: 'done'; username: string; games: Game[]; downloaded: number; offline: boolean }
  | { status: 'error'; message: string }

/** Charge les parties d'un joueur (cache d'abord, réseau ensuite) et expose l'avancement. */
export function useGames() {
  const [state, setState] = useState<LoadState>({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)

  // Annule un chargement en cours si le composant disparaît.
  useEffect(() => () => controller.current?.abort(), [])

  const load = useCallback(async (username: string, since?: Date) => {
    controller.current?.abort()
    const ctrl = new AbortController()
    controller.current = ctrl
    let fromCache = 0

    setState({ status: 'loading', done: 0, total: 0, fromCache, waitMs: null })
    try {
      const result = await loadPlayerGames(username, {
        since,
        signal: ctrl.signal,
        onProgress: ({ done, total, source }) => {
          if (source === 'cache') fromCache++
          if (!ctrl.signal.aborted) {
            setState({ status: 'loading', done, total, fromCache, waitMs: null })
          }
        },
        onRateLimit: (waitMs) => setState((s) => (s.status === 'loading' ? { ...s, waitMs } : s)),
      })
      if (!ctrl.signal.aborted) setState({ status: 'done', username, ...result })
    } catch (err) {
      if (ctrl.signal.aborted) return
      const message =
        err instanceof ChessComError ? err.message : 'Erreur inattendue pendant le chargement.'
      setState({ status: 'error', message })
    }
  }, [])

  const reset = useCallback(() => {
    controller.current?.abort()
    setState({ status: 'idle' })
  }, [])

  return { state, load, reset }
}
