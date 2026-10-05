import type { Game } from '../lib/games'

const OUTCOME_LABEL = { win: 'Victoire', loss: 'Défaite', draw: 'Nulle' } as const
const OUTCOME_CLASS = { win: 'text-win', loss: 'text-loss', draw: 'text-muted' } as const

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function GameList({ games }: { games: readonly Game[] }) {
  if (games.length === 0) {
    return <p className="text-muted">Aucune partie pour cette cadence sur la période.</p>
  }

  // Les plus récentes en premier.
  const recent = [...games].reverse().slice(0, 50)

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <ul className="divide-y divide-line">
        {recent.map((g) => (
          <li key={g.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span
              aria-label={g.color === 'white' ? 'Blancs' : 'Noirs'}
              title={g.color === 'white' ? 'Blancs' : 'Noirs'}
              className={`size-3 shrink-0 rounded-full border border-line ${
                g.color === 'white' ? 'bg-white' : 'bg-neutral-900'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate">
                {g.opponent} <span className="text-muted tabular-nums">({g.opponentRating})</span>
              </div>
              <div className="truncate text-xs text-muted">{g.opening ?? 'Ouverture inconnue'}</div>
            </div>
            <div className="text-right">
              <div className={OUTCOME_CLASS[g.outcome]}>{OUTCOME_LABEL[g.outcome]}</div>
              <div className="text-xs text-muted tabular-nums">{dateFormat.format(g.endTime)}</div>
            </div>
          </li>
        ))}
      </ul>
      {games.length > recent.length && (
        <p className="border-t border-line px-4 py-2 text-xs text-muted">
          50 parties les plus récentes affichées sur {games.length}.
        </p>
      )}
    </div>
  )
}
