import { useEffect, useMemo, useRef, useState } from 'react'
import type { Arrow } from 'react-chessboard'
import type { GameAnalysis } from '../../lib/analysis'
import { StockfishEngine } from '../../lib/engine'
import { formatEval, toFrenchSan } from '../../lib/engineStats'
import type { Game } from '../../lib/games'
import {
  buildPuzzles,
  judgeMove,
  tryMove,
  type Puzzle,
  type PuzzleResult,
  type TriedMove,
} from '../../lib/puzzles'
import { Board } from '../Board'
import { Card } from '../Card'

type Status =
  | { kind: 'playing' }
  | { kind: 'checking'; move: TriedMove }
  | { kind: 'best' | 'good' | 'wrong'; move: TriedMove }
  | { kind: 'revealed' }
  | { kind: 'error'; message: string }

const JUDGE_DEPTH = 12
const GREEN = 'rgba(21, 128, 61, 0.85)'
const RED = 'rgba(185, 28, 28, 0.8)'

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

function squares(uci: string): [string, string] {
  return [uci.slice(0, 2), uci.slice(2, 4)]
}

interface Props {
  games: readonly Game[]
  analyses: ReadonlyMap<string, GameAnalysis>
  results: ReadonlyMap<string, PuzzleResult>
  onResult: (id: string, solved: boolean) => void
  onGoToAnalysis: () => void
}

export function PuzzlesView({ games, analyses, results, onResult, onGoToAnalysis }: Props) {
  const all = useMemo(() => buildPuzzles(games, analyses), [games, analyses])
  const [onlyTodo, setOnlyTodo] = useState(true)
  // Puzzles touchés pendant cette séance : ils restent dans la liste « à faire » une fois résolus,
  // pour qu'un puzzle ne disparaisse pas sous tes yeux.
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set())
  const list = onlyTodo ? all.filter((p) => !results.get(p.id)?.solved || touched.has(p.id)) : all
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState<Status>({ kind: 'playing' })
  const engineRef = useRef<Promise<StockfishEngine> | null>(null)

  // Le moteur n'est démarré qu'au premier coup à vérifier, et arrêté en quittant l'onglet.
  useEffect(
    () => () => {
      void engineRef.current?.then((e) => e.terminate()).catch(() => undefined)
    },
    [],
  )

  const solvedCount = all.filter((p) => results.get(p.id)?.solved).length

  if (all.length === 0) {
    return (
      <Card title="Mes erreurs en puzzles">
        <p className="text-sm text-muted">
          Les puzzles sont tirés de tes propres gaffes : il faut d’abord analyser des parties.
        </p>
        <button type="button" onClick={onGoToAnalysis} className="btn-primary mt-3">
          Aller à l’analyse
        </button>
      </Card>
    )
  }

  const puzzle: Puzzle | undefined = list[Math.min(index, list.length - 1)]

  function go(i: number) {
    setIndex(i)
    setStatus({ kind: 'playing' })
  }

  function handleMove(from: string, to: string): boolean {
    if (!puzzle || status.kind !== 'playing') return false
    const move = tryMove(puzzle.fen, from, to)
    if (!move) return false
    setTouched((t) => new Set(t).add(puzzle.id))
    setStatus({ kind: 'checking', move })
    void (async () => {
      try {
        engineRef.current ??= StockfishEngine.create()
        const verdict = await judgeMove(puzzle, move, await engineRef.current, JUDGE_DEPTH)
        onResult(puzzle.id, verdict !== 'wrong')
        setStatus({ kind: verdict, move })
      } catch {
        engineRef.current = null
        setStatus({ kind: 'error', message: 'Impossible de vérifier le coup avec Stockfish.' })
      }
    })()
    return true
  }

  if (!puzzle) {
    return (
      <Card title="Mes erreurs en puzzles">
        <p className="text-sm text-muted">Tous tes puzzles sont résolus. Bravo !</p>
        <button type="button" onClick={() => setOnlyTodo(false)} className="btn-secondary mt-3">
          Tout revoir
        </button>
      </Card>
    )
  }

  const shownFen =
    status.kind === 'checking' ||
    status.kind === 'best' ||
    status.kind === 'good' ||
    status.kind === 'wrong'
      ? status.move.fenAfter
      : puzzle.fen
  const arrows: Arrow[] = []
  if (status.kind === 'revealed') {
    // Flèche verte : la solution ; flèche rouge : le coup joué dans la partie.
    const [s, e] = squares(puzzle.bestUci)
    const [ps, pe] = squares(puzzle.playedUci)
    arrows.push({ startSquare: ps, endSquare: pe, color: RED })
    arrows.push({ startSquare: s, endSquare: e, color: GREEN })
  }
  const highlight =
    status.kind === 'wrong' || status.kind === 'best' || status.kind === 'good'
      ? Object.fromEntries(
          squares(status.move.uci).map((sq) => [
            sq,
            {
              background: status.kind === 'wrong' ? 'rgba(239,68,68,0.45)' : 'rgba(34,197,94,0.45)',
            },
          ]),
        )
      : {}

  const pos = Math.min(index, list.length - 1)
  const result = results.get(puzzle.id)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted tabular-nums">
          {solvedCount} / {all.length} puzzles résolus
        </p>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={onlyTodo}
            onChange={(e) => {
              setOnlyTodo(e.target.checked)
              go(0)
            }}
            className="accent-accent"
          />
          Seulement ceux à faire
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,28rem)_1fr]">
        <Board
          fen={shownFen}
          orientation={puzzle.color}
          onMove={handleMove}
          disabled={status.kind !== 'playing'}
          arrows={arrows}
          highlight={highlight}
        />

        <Card
          title={`Puzzle ${pos + 1} / ${list.length}`}
          subtitle={`Contre ${puzzle.opponent} · ${dateFormat.format(puzzle.endTime)} · coup ${puzzle.moveNumber}${result?.solved ? ' · déjà résolu ✓' : ''}`}
        >
          <div className="flex flex-col gap-3 text-sm">
            <p>
              Tu as les <strong>{puzzle.color === 'white' ? 'blancs' : 'noirs'}</strong>. Dans la
              partie, ce coup t’a coûté{' '}
              <strong className="tabular-nums">{formatEval(puzzle.loss).replace('+', '')}</strong>{' '}
              pion(s). Trouve mieux.
            </p>

            <div aria-live="polite" className="min-h-12">
              {status.kind === 'playing' && (
                <p className="text-muted">Joue ton coup (glisse la pièce ou clique deux cases).</p>
              )}
              {status.kind === 'checking' && (
                <p className="text-muted">Stockfish vérifie ton coup…</p>
              )}
              {status.kind === 'best' && (
                <p className="text-win">
                  ✓ Exact ! {toFrenchSan(status.move.san)} est le meilleur coup.
                </p>
              )}
              {status.kind === 'good' && (
                <p className="text-win">
                  ✓ Bien vu : {toFrenchSan(status.move.san)} tient la position (le moteur préférait{' '}
                  {toFrenchSan(puzzle.best)}).
                </p>
              )}
              {status.kind === 'wrong' && (
                <p className="text-loss">
                  ✗ {toFrenchSan(status.move.san)} ne suffit pas. Réessaie ou regarde la solution.
                </p>
              )}
              {status.kind === 'revealed' && (
                <p>
                  Solution : <strong className="text-win">{toFrenchSan(puzzle.best)}</strong>. Dans
                  la partie, tu avais joué{' '}
                  <strong className="text-loss">{toFrenchSan(puzzle.played)}</strong>.
                </p>
              )}
              {status.kind === 'error' && <p className="text-loss">{status.message}</p>}
            </div>

            <div className="flex flex-wrap gap-2">
              {(status.kind === 'wrong' || status.kind === 'error') && (
                <button
                  type="button"
                  onClick={() => setStatus({ kind: 'playing' })}
                  className="btn-secondary"
                >
                  Réessayer
                </button>
              )}
              {status.kind !== 'revealed' && status.kind !== 'best' && status.kind !== 'good' && (
                <button
                  type="button"
                  onClick={() => {
                    if (!result?.solved) onResult(puzzle.id, false)
                    setTouched((t) => new Set(t).add(puzzle.id))
                    setStatus({ kind: 'revealed' })
                  }}
                  disabled={status.kind === 'checking'}
                  className="btn-secondary"
                >
                  Voir la solution
                </button>
              )}
              <button
                type="button"
                onClick={() => go(pos + 1)}
                disabled={pos + 1 >= list.length}
                className="btn-primary"
              >
                Suivant →
              </button>
            </div>
            {pos > 0 && (
              <button
                type="button"
                onClick={() => go(pos - 1)}
                className="self-start text-xs text-muted hover:text-fg"
              >
                ← Précédent
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
