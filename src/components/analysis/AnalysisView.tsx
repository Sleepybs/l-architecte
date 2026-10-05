import { useMemo, useState } from 'react'
import type { RunState } from '../../hooks/useAnalyses'
import type { GameAnalysis } from '../../lib/analysis'
import { engineSummary, formatEval, playerMistakes, toFrenchSan } from '../../lib/engineStats'
import type { Game } from '../../lib/games'
import { Card } from '../Card'
import { LichessButton } from '../LichessButton'
import { EngineSummaryCards } from './EngineSummaryCards'
import { EvalChart } from './EvalChart'

const SCOPES = [
  { value: 'losses10', label: '10 dernières défaites' },
  { value: 'last20', label: '20 dernières parties' },
  { value: 'last50', label: '50 dernières parties' },
] as const
type Scope = (typeof SCOPES)[number]['value']

const DEPTHS = [
  { value: 10, label: 'Rapide (profondeur 10)' },
  { value: 12, label: 'Équilibrée (profondeur 12)' },
  { value: 14, label: 'Précise (profondeur 14)' },
] as const

function selectGames(games: readonly Game[], scope: Scope): Game[] {
  const recent = [...games].reverse()
  if (scope === 'losses10') return recent.filter((g) => g.outcome === 'loss').slice(0, 10)
  return recent.slice(0, scope === 'last20' ? 20 : 50)
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

function AnalyzedGame({ game, analysis }: { game: Game; analysis: GameAnalysis }) {
  const [open, setOpen] = useState(false)
  const mine = playerMistakes(game, analysis)
  const tp = analysis.turningPoint
  return (
    <li className="py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left text-sm"
      >
        <span className="text-muted">{open ? '▾' : '▸'}</span>
        <span className="min-w-0 flex-1 truncate">
          vs {game.opponent}{' '}
          <span className="text-xs text-muted">· {dateFormat.format(game.endTime)}</span>
        </span>
        <span className="text-xs whitespace-nowrap text-muted">
          {mine.length === 0 ? 'aucune gaffe' : `${mine.length} gaffe${mine.length > 1 ? 's' : ''}`}
          {tp &&
            ` · tournant coup ${tp.moveNumber} (${tp.color === game.color ? 'ton erreur' : 'erreur adverse'})`}
        </span>
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-3 pl-6">
          <EvalChart analysis={analysis} color={game.color} />
          {mine.length > 0 && (
            <ul className="flex flex-col gap-1.5 text-sm">
              {mine.map((m) => (
                <li key={m.ply} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-xs text-muted tabular-nums">Coup {m.moveNumber}</span>
                  <span>
                    tu as joué <strong className="text-loss">{toFrenchSan(m.played)}</strong>
                    {m.best && (
                      <>
                        , meilleur : <strong className="text-win">{toFrenchSan(m.best)}</strong>
                      </>
                    )}
                  </span>
                  <span className="text-xs text-muted tabular-nums">
                    {formatEval(m.before)} → {formatEval(m.after)}
                    {m.materialLost && ' · pièce perdue'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div>
            <LichessButton game={game} />
          </div>
        </div>
      )}
    </li>
  )
}

interface Props {
  games: readonly Game[]
  analyses: ReadonlyMap<string, GameAnalysis>
  run: RunState
  onAnalyze: (games: Game[], depth: number) => void
  onStop: () => void
}

export function AnalysisView({ games, analyses, run, onAnalyze, onStop }: Props) {
  const [scope, setScope] = useState<Scope>('losses10')
  const [depth, setDepth] = useState<number>(12)

  const selected = useMemo(() => selectGames(games, scope), [games, scope])
  // On ne refait pas une partie déjà analysée au moins aussi profondément.
  const pending = selected.filter((g) => (analyses.get(g.id)?.depth ?? 0) < depth)
  const summary = useMemo(() => engineSummary(games, analyses), [games, analyses])
  const analyzedGames = useMemo(
    () => [...games].reverse().filter((g) => analyses.has(g.id)),
    [games, analyses],
  )
  const busy = run.status === 'starting' || run.status === 'running'
  const progress =
    run.status === 'running' ? (run.game - 1 + run.position / run.positions) / run.games : 0

  return (
    <div className="flex flex-col gap-4">
      <Card
        title="Analyse Stockfish"
        subtitle="Stockfish 19 (version légère) tourne dans ton navigateur : aucune donnée n’est envoyée."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-muted">Parties</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as Scope)}
              disabled={busy}
              className="field"
            >
              {SCOPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-muted">Précision</span>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              disabled={busy}
              className="field"
            >
              {DEPTHS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          {busy ? (
            <button type="button" onClick={onStop} className="btn-secondary">
              Arrêter
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onAnalyze(pending, depth)}
              disabled={pending.length === 0}
              className="btn-primary"
            >
              {pending.length === 0
                ? 'Déjà analysées'
                : `Analyser ${pending.length} partie${pending.length > 1 ? 's' : ''}`}
            </button>
          )}
        </div>

        {busy && (
          <div className="mt-4 flex flex-col gap-2" aria-live="polite">
            <p className="text-sm text-muted">
              {run.status === 'starting'
                ? 'Démarrage de Stockfish…'
                : `Partie ${run.game} / ${run.games} · position ${run.position} / ${run.positions}`}
            </p>
            <div className="h-1 overflow-hidden rounded bg-surface-2">
              <div
                className="h-full bg-accent transition-[width]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted">
              Tu peux continuer à naviguer : les résultats s’affichent au fur et à mesure.
            </p>
          </div>
        )}
        {run.status === 'error' && (
          <p role="alert" className="mt-3 text-sm text-loss">
            {run.message}
          </p>
        )}
      </Card>

      {summary.analyzed === 0 ? (
        <p className="text-sm text-muted">
          Aucune partie analysée pour cette cadence. Commence par tes 10 dernières défaites : c’est
          là que se cachent les erreurs qui coûtent des points.
        </p>
      ) : (
        <>
          <EngineSummaryCards summary={summary} />
          <Card title="Parties analysées" subtitle="Clique sur une partie pour voir ses gaffes.">
            <ul className="divide-y divide-line">
              {analyzedGames.map((g) => {
                const a = analyses.get(g.id)
                return a ? <AnalyzedGame key={g.id} game={g} analysis={a} /> : null
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}
