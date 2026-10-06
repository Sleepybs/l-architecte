import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnalysisView } from './components/analysis/AnalysisView'
import { BlunderBadge } from './components/analysis/BlunderBadge'
import { ClearDataButton } from './components/ClearDataButton'
import { Dashboard } from './components/dashboard/Dashboard'
import { GameList } from './components/GameList'
import { LoadingStatus } from './components/LoadingStatus'
import { ProgressView } from './components/progress/ProgressView'
import { PuzzlesView } from './components/puzzles/PuzzlesView'
import { SearchForm, type Search } from './components/SearchForm'
import { ThemeToggle } from './components/ThemeToggle'
import { TimeClassTabs } from './components/TimeClassTabs'
import { ViewTabs } from './components/ViewTabs'
import { useAnalyses } from './hooks/useAnalyses'
import { useGames } from './hooks/useGames'
import { usePuzzleResults } from './hooks/usePuzzleResults'
import { dbGet, dbPut } from './lib/db'
import { filterGames, PERIODS, sinceDate, type TimeClass } from './lib/games'
import { normalizeUsername } from './lib/username'

type View = 'dashboard' | 'games' | 'analysis' | 'puzzles' | 'progress'

const VIEWS = [
  { value: 'dashboard', label: 'Tableau de bord' },
  { value: 'games', label: 'Parties' },
  { value: 'analysis', label: 'Analyse' },
  { value: 'puzzles', label: 'Puzzles' },
  { value: 'progress', label: 'Progression' },
] as const

const TIME_CLASS_LABEL: Record<TimeClass, string> = {
  rapid: 'Rapid',
  blitz: 'Blitz',
  daily: 'Daily',
  bullet: 'Bullet',
}

const LAST_SEARCH_KEY = 'meta|lastSearch'

/** Relit la dernière recherche en la revalidant (une donnée stockée n'est jamais crue sur parole). */
async function readLastSearch(): Promise<Search | undefined> {
  const s = await dbGet<Search>('kv', LAST_SEARCH_KEY).catch(() => undefined)
  const username = s && normalizeUsername(String(s.username))
  if (!s || !username || !PERIODS[s.periodIndex]) return undefined
  return { username, periodIndex: s.periodIndex }
}

export default function App() {
  const { state, load, reset } = useGames()
  const username = state.status === 'done' ? state.username : null
  const engine = useAnalyses(username)
  const puzzles = usePuzzleResults(username)
  const [timeClass, setTimeClass] = useState<TimeClass>('rapid')
  const [since, setSince] = useState<Date | undefined>()
  const [view, setView] = useState<View>('dashboard')
  // undefined = pas encore lu ; null = aucune recherche mémorisée.
  const [initial, setInitial] = useState<Search | null | undefined>(undefined)
  const [formKey, setFormKey] = useState(0)

  const search = useCallback(
    (s: Search) => {
      const date = sinceDate(PERIODS[s.periodIndex]?.days ?? null)
      setSince(date)
      void dbPut('kv', LAST_SEARCH_KEY, s).catch(() => undefined)
      void load(s.username, date)
    },
    [load],
  )

  // Au démarrage : on relance la dernière recherche (rapide grâce au cache).
  useEffect(() => {
    let alive = true
    void readLastSearch().then((s) => {
      if (!alive) return
      setInitial(s ?? null)
      if (s) search(s)
    })
    return () => {
      alive = false
    }
  }, [search])

  function handleCleared() {
    reset()
    setInitial(null)
    setFormKey((k) => k + 1) // remonte le formulaire vide
  }

  const allGames = useMemo(() => (state.status === 'done' ? state.games : []), [state])
  const games = useMemo(
    () => filterGames(allGames, { timeClass, since }),
    [allGames, timeClass, since],
  )
  const counts = useMemo(() => {
    const c: Record<TimeClass, number> = { rapid: 0, blitz: 0, daily: 0, bullet: 0 }
    const min = since?.getTime() ?? 0
    for (const g of allGames) if (g.endTime >= min) c[g.timeClass]++
    return c
  }, [allGames, since])

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          L’<span className="text-accent">Architecte</span>
        </h1>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col gap-6">
        {initial !== undefined && (
          <SearchForm
            key={formKey}
            initial={initial ?? undefined}
            loading={state.status === 'loading'}
            onSubmit={search}
          />
        )}

        {state.status === 'idle' && initial === null && (
          <p className="text-sm text-muted">
            Entre ton pseudo chess.com pour analyser tes parties publiques. Rien à installer, pas de
            compte : tout reste dans ton navigateur.
          </p>
        )}

        {state.status === 'loading' && <LoadingStatus state={state} />}

        {state.status === 'error' && (
          <p role="alert" className="rounded-lg border border-loss/40 px-4 py-3 text-sm text-loss">
            {state.message}
          </p>
        )}

        {state.status === 'done' && (
          <section className="flex flex-col gap-4">
            {state.offline && (
              <p
                role="status"
                className="rounded-lg border border-line px-4 py-3 text-sm text-muted"
              >
                chess.com est injoignable : affichage des parties en cache.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-medium">{state.username}</h2>
              <TimeClassTabs value={timeClass} counts={counts} onChange={setTimeClass} />
            </div>
            <ViewTabs tabs={VIEWS} value={view} onChange={setView} />
            {view === 'dashboard' && (
              <Dashboard
                games={games}
                timeClassLabel={TIME_CLASS_LABEL[timeClass]}
                analyses={engine.analyses}
              />
            )}
            {view === 'games' && (
              <GameList
                games={games}
                renderExtra={(g) => <BlunderBadge game={g} analysis={engine.analyses.get(g.id)} />}
              />
            )}
            {view === 'analysis' && (
              <AnalysisView
                games={games}
                analyses={engine.analyses}
                run={engine.run}
                onAnalyze={(list, depth) => void engine.analyze(list, depth)}
                onStop={engine.stop}
              />
            )}
            {view === 'puzzles' && (
              <PuzzlesView
                key={timeClass} // repart du premier puzzle quand la cadence change
                games={games}
                analyses={engine.analyses}
                results={puzzles.results}
                onResult={puzzles.record}
                onGoToAnalysis={() => setView('analysis')}
              />
            )}
            {view === 'progress' && (
              <ProgressView
                username={state.username}
                timeClass={timeClass}
                games={games}
                analyses={engine.analyses}
                puzzles={puzzles.results}
              />
            )}
          </section>
        )}
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
        <span>
          Projet non affilié à Chess.com ni à Lichess. Logiciel libre sous licence GPL-3.0.
        </span>
        <ClearDataButton onCleared={handleCleared} />
      </footer>
    </div>
  )
}
