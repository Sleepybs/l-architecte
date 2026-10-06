import { useState, type ReactNode } from 'react'
import type { Game, Outcome } from '../lib/games'
import { LichessButton } from './LichessButton'

const OUTCOME_LABEL = { win: 'Victoire', loss: 'Défaite', draw: 'Nulle' } as const
const OUTCOME_CLASS = { win: 'text-win', loss: 'text-loss', draw: 'text-muted' } as const
const RESULT_DETAIL: Record<string, string> = {
  checkmated: 'mat',
  resigned: 'abandon',
  timeout: 'temps',
  abandoned: 'partie quittée',
  agreed: 'accord',
  repetition: 'répétition',
  stalemate: 'pat',
  insufficient: 'matériel insuffisant',
  timevsinsufficient: 'temps / matériel',
  '50move': '50 coups',
}

const FILTERS: { value: Outcome | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'loss', label: 'Défaites' },
  { value: 'win', label: 'Victoires' },
  { value: 'draw', label: 'Nulles' },
]

const PAGE = 30

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

/** N'affiche un lien que s'il pointe vraiment vers une partie chess.com (jamais de javascript:…). */
function safeGameUrl(url: string): string | null {
  return /^https:\/\/www\.chess\.com\/game\//.test(url) ? url : null
}

function Badge({ children, tone }: { children: ReactNode; tone: 'good' | 'bad' }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[11px] ${
        tone === 'good' ? 'bg-win/15 text-win' : 'bg-loss/15 text-loss'
      }`}
    >
      {children}
    </span>
  )
}

function GameRow({ g, extra }: { g: Game; extra?: ReactNode }) {
  const url = safeGameUrl(g.url)
  const castledEarly = g.early?.castleMove != null && g.early.castleMove < 10
  const queenEarly = g.early?.queenMove != null && g.early.queenMove < 5
  return (
    <li className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          role="img"
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
          {(castledEarly || queenEarly || extra) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {castledEarly && <Badge tone="good">roque coup {g.early?.castleMove}</Badge>}
              {queenEarly && <Badge tone="bad">dame coup {g.early?.queenMove}</Badge>}
              {extra}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className={OUTCOME_CLASS[g.outcome]}>
            {OUTCOME_LABEL[g.outcome]}
            {Object.hasOwn(RESULT_DETAIL, g.result) && (
              <span className="text-xs text-muted"> · {RESULT_DETAIL[g.result]}</span>
            )}
          </div>
          <div className="text-xs text-muted tabular-nums">{dateFormat.format(g.endTime)}</div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-2 py-1 text-xs text-muted hover:text-fg"
          >
            Voir la partie ↗
          </a>
        )}
        <LichessButton game={g} />
      </div>
    </li>
  )
}

interface Props {
  games: readonly Game[]
  /** Contenu supplémentaire par partie (ex. résultat de l'analyse moteur). */
  renderExtra?: (g: Game) => ReactNode
}

export function GameList({ games, renderExtra }: Props) {
  const [filter, setFilter] = useState<Outcome | 'all'>('all')
  const [limit, setLimit] = useState(PAGE)

  const filtered = [...games].reverse().filter((g) => filter === 'all' || g.outcome === filter)
  const visible = filtered.slice(0, limit)

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Filtrer par résultat" className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => {
              setFilter(f.value)
              setLimit(PAGE)
            }}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filter === f.value ? 'border-accent text-fg' : 'border-line text-muted hover:text-fg'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted">Aucune partie pour ce filtre.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <ul className="divide-y divide-line">
            {visible.map((g) => (
              <GameRow key={g.id} g={g} extra={renderExtra?.(g)} />
            ))}
          </ul>
          {filtered.length > visible.length && (
            <button
              type="button"
              onClick={() => setLimit((l) => l + PAGE)}
              className="w-full border-t border-line px-4 py-2 text-xs text-muted hover:text-fg"
            >
              Afficher plus ({filtered.length - visible.length} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
