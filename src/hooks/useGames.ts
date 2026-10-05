import { useCallback, useEffect, useRef, useState } from 'react'
import { ChessComError, fetchGames } from '../lib/chesscom'
import { toGames, type Game } from '../lib/games'

export type LoadPhase = 'download' | 'analyse'

export type LoadState =
  | { status: 'idle' }
  | { status: 'loading'; phase: LoadPhase; done: number; total: number; waitMs: number | null }
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
    const progress = (phase: LoadPhase) => (done: number, total: number) => {
      if (!ctrl.signal.aborted) setState({ status: 'loading', phase, done, total, waitMs: null })
    }

    progress('download')(0, 0)
    try {
      const raw = await fetchGames(username, {
        since,
        signal: ctrl.signal,
        onProgress: progress('download'),
        onRateLimit: (waitMs) => setState((s) => (s.status === 'loading' ? { ...s, waitMs } : s)),
      })
      const games = await toGames(raw, username, progress('analyse'))
      if (!ctrl.signal.aborted) setState({ status: 'done', username, games })
    } catch (err) {
      if (ctrl.signal.aborted) return
      const message =
        err instanceof ChessComError ? err.message : 'Erreur inattendue pendant le chargement.'
      setState({ status: 'error', message })
    }
  }, [])

  return { state, load }
}
