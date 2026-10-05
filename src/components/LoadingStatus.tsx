import type { LoadState } from '../hooks/useGames'

type Loading = Extract<LoadState, { status: 'loading' }>

function message(s: Loading): string {
  if (s.waitMs !== null) {
    return `chess.com demande de ralentir : nouvelle tentative dans ${Math.round(s.waitMs / 1000)} s…`
  }
  if (s.phase === 'analyse') return `Analyse des débuts de partie : ${s.done} / ${s.total}`
  if (s.total === 0) return 'Recherche des archives…'
  return `Téléchargement des archives mensuelles : ${s.done} / ${s.total}`
}

export function LoadingStatus({ state }: { state: Loading }) {
  const ratio = state.total > 0 ? state.done / state.total : 0
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <p className="text-sm text-muted">{message(state)}</p>
      <div className="h-1 overflow-hidden rounded bg-surface-2">
        <div
          className="h-full bg-accent transition-[width]"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  )
}
