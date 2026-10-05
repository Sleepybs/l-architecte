import { useCallback, useEffect, useRef, useState } from 'react'
import { analyzeGame, ANALYSIS_VERSION, type GameAnalysis } from '../lib/analysis'
import { dbGetByPrefix, dbPut } from '../lib/db'
import { StockfishEngine } from '../lib/engine'
import type { Game } from '../lib/games'

interface StoredAnalysis extends GameAnalysis {
  gameId: string
}

export type RunState =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'running'; game: number; games: number; position: number; positions: number }
  | { status: 'error'; message: string }

const key = (username: string, gameId: string) => `${username}|${gameId}`
const EMPTY: ReadonlyMap<string, GameAnalysis> = new Map()

/** Analyses Stockfish d'un joueur : lues depuis le cache, lancées à la demande. */
export function useAnalyses(username: string | null) {
  // Les analyses sont rangées avec le joueur auquel elles appartiennent :
  // si le joueur change, on n'affiche jamais les analyses de l'ancien.
  const [store, setStore] = useState<{
    user: string | null
    map: ReadonlyMap<string, GameAnalysis>
  }>({ user: null, map: EMPTY })
  const analyses = store.user === username ? store.map : EMPTY
  const [run, setRun] = useState<RunState>({ status: 'idle' })
  const engineRef = useRef<StockfishEngine | null>(null)
  const ctrlRef = useRef<AbortController | null>(null)

  // Recharge les analyses en cache quand le joueur change.
  useEffect(() => {
    if (!username) return
    let alive = true
    void dbGetByPrefix<StoredAnalysis>('analyses', `${username}|`)
      .catch(() => [])
      .then((list) => {
        if (!alive) return
        const map = new Map<string, GameAnalysis>()
        for (const a of list) if (a.version === ANALYSIS_VERSION) map.set(a.gameId, a)
        setStore({ user: username, map })
      })
    return () => {
      alive = false
    }
  }, [username])

  const stop = useCallback(() => {
    ctrlRef.current?.abort()
    engineRef.current?.terminate() // coupe net le calcul en cours
    engineRef.current = null
    setRun({ status: 'idle' })
  }, [])

  // Arrête le moteur si on quitte la page.
  useEffect(() => stop, [stop])

  const analyze = useCallback(
    async (games: readonly Game[], depth: number) => {
      if (!username || games.length === 0) return
      stop()
      const ctrl = new AbortController()
      ctrlRef.current = ctrl
      setRun({ status: 'starting' })
      try {
        const engine = await StockfishEngine.create()
        if (ctrl.signal.aborted) {
          engine.terminate()
          return
        }
        engineRef.current = engine
        for (const [i, game] of games.entries()) {
          const result = await analyzeGame(game.pgn, engine, {
            depth,
            signal: ctrl.signal,
            onProgress: (position, positions) =>
              setRun({ status: 'running', game: i + 1, games: games.length, position, positions }),
          })
          await dbPut<StoredAnalysis>('analyses', key(username, game.id), {
            ...result,
            gameId: game.id,
          }).catch(() => undefined)
          setStore((prev) =>
            prev.user === username
              ? { user: username, map: new Map(prev.map).set(game.id, result) }
              : { user: username, map: new Map([[game.id, result]]) },
          )
        }
        setRun({ status: 'idle' })
      } catch (err) {
        if (ctrl.signal.aborted) return
        setRun({
          status: 'error',
          message: err instanceof Error ? err.message : 'L’analyse a échoué.',
        })
      } finally {
        if (ctrlRef.current === ctrl) {
          engineRef.current?.terminate()
          engineRef.current = null
        }
      }
    },
    [username, stop],
  )

  return { analyses, run, analyze, stop }
}
