import { useCallback, useEffect, useRef, useState } from 'react'
import { ChessComError, fetchGames } from '../lib/chesscom'
import { toGame, type Game } from '../lib/games'

export type LoadState =
  | { status: 'idle' }
  | { status: 'loading'; done: number; total: number; waitMs: number | null }
  | { status: 'done'; username: string; games: Game[] }
  | { status: 'error'; message: string }

/** Charge les parties d'un joueur et expose l'avancement à l'interface. */
export function useGames() {
  const [state, setState] = useState<LoadState>({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)

  // Annule un chargement en cours si le composant disparaît.
  useEffect(() => () => controller.current?.abort(), [])

  const load = useCallback(async (username: string, since?: Date) => {
    controller.current?.abort()
    const ctrl = new AbortController()
    controller.current = ctrl

    setState({ status: 'loading', done: 0, total: 0, waitMs: null })
    try {
      const raw = await fetchGames(username, {
        since,
        signal: ctrl.signal,
        onProgress: (done, total) => setState({ status: 'loading', done, total, waitMs: null }),
        onRateLimit: (waitMs) => setState((s) => (s.status === 'loading' ? { ...s, waitMs } : s)),
      })
      const games = raw.map((g) => toGame(g, username)).filter((g): g is Game => g !== null)
      setState({ status: 'done', username, games })
    } catch (err) {
      if (ctrl.signal.aborted) return
      const message =
        err instanceof ChessComError ? err.message : 'Erreur inattendue pendant le chargement.'
      setState({ status: 'error', message })
    }
  }, [])

  return { state, load }
}
