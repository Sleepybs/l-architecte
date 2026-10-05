import { useMemo, useState } from 'react'
import { GameList } from './components/GameList'
import { SearchForm } from './components/SearchForm'
import { ThemeToggle } from './components/ThemeToggle'
import { TimeClassTabs } from './components/TimeClassTabs'
import { useGames } from './hooks/useGames'
import { filterGames, sinceDate, type TimeClass } from './lib/games'

export default function App() {
  const { state, load } = useGames()
  const [timeClass, setTimeClass] = useState<TimeClass>('rapid')
  const [since, setSince] = useState<Date | undefined>()

  function handleSearch(username: string, periodDays: number | null) {
    const date = sinceDate(periodDays)
    setSince(date)
    void load(username, date)
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
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          L’<span className="text-accent">Architecte</span>
        </h1>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col gap-6">
        <SearchForm loading={state.status === 'loading'} onSubmit={handleSearch} />

        {state.status === 'loading' && (
          <p className="text-sm text-muted" aria-live="polite">
            {state.waitMs !== null
              ? `chess.com demande de ralentir : nouvelle tentative dans ${Math.round(state.waitMs / 1000)} s…`
              : state.total === 0
                ? 'Recherche des archives…'
                : `Téléchargement des archives mensuelles : ${state.done} / ${state.total}`}
          </p>
        )}

        {state.status === 'error' && (
          <p role="alert" className="rounded-lg border border-loss/40 px-4 py-3 text-sm text-loss">
            {state.message}
          </p>
        )}

        {state.status === 'done' && (
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-medium">{state.username}</h2>
              <TimeClassTabs value={timeClass} counts={counts} onChange={setTimeClass} />
            </div>
            <GameList games={games} />
          </section>
        )}
      </main>

      <footer className="border-t border-line pt-4 text-xs text-muted">
        Projet non affilié à Chess.com ni à Lichess. Logiciel libre sous licence GPL-3.0.
      </footer>
    </div>
  )
}
