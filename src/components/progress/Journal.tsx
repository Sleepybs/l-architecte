import { useState, type FormEvent } from 'react'
import {
  FOCUSES,
  NOTE_MAX,
  summarize,
  today,
  type EntryInput,
  type Focus,
  type JournalEntry,
} from '../../lib/journal'
import { Card } from '../Card'

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h === 0 ? `${m} min` : `${h} h ${String(m).padStart(2, '0')}`
}

interface Props {
  entries: readonly JournalEntry[]
  weekSince: string
  onAdd: (input: EntryInput) => Promise<string | null>
  onRemove: (id: string) => void
}

export function Journal({ entries, weekSince, onAdd, onRemove }: Props) {
  const [date, setDate] = useState(() => today())
  const [minutes, setMinutes] = useState('30')
  const [focus, setFocus] = useState<Focus>('tactics')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const week = summarize(entries, weekSince)
  const visible = showAll ? entries : entries.slice(0, 10)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const err = await onAdd({ date, minutes: Number(minutes), focus, note })
    setError(err)
    if (!err) setNote('')
  }

  return (
    <Card
      title="Journal de séance"
      subtitle="Note ce que tu travailles : la régularité fait progresser."
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <div className="text-xs text-muted">Séances cette semaine</div>
            <div className="text-xl font-semibold tabular-nums">{week.sessions}</div>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <div className="text-xs text-muted">Temps cette semaine</div>
            <div className="text-xl font-semibold tabular-nums">{formatMinutes(week.minutes)}</div>
          </div>
          <div className="col-span-2 rounded-lg bg-surface-2 px-3 py-2 sm:col-span-1">
            <div className="text-xs text-muted">Thème principal</div>
            <div className="truncate text-xl font-semibold">
              {(() => {
                const top = (Object.entries(week.byFocus) as [Focus, number][]).sort(
                  (a, b) => b[1] - a[1],
                )[0]
                return top ? FOCUSES[top[0]] : '—'
              })()}
            </div>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Date</span>
              <input
                type="date"
                value={date}
                max={today()}
                onChange={(e) => setDate(e.target.value)}
                className="field"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Durée (min)</span>
              <input
                type="number"
                min={1}
                max={600}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="field"
                required
              />
            </label>
            <label className="col-span-2 flex flex-col gap-1 text-sm sm:col-span-1">
              <span className="text-muted">Thème</span>
              <select
                value={focus}
                onChange={(e) => setFocus(e.target.value as Focus)}
                className="field"
              >
                {(Object.keys(FOCUSES) as Focus[]).map((f) => (
                  <option key={f} value={f}>
                    {FOCUSES[f]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Ce que j’en retiens (facultatif)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={NOTE_MAX}
              rows={2}
              placeholder="ex. Je rate les fourchettes de cavalier quand je suis pressé par le temps."
              className="field resize-y"
            />
          </label>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary">
              Ajouter la séance
            </button>
            {error && (
              <span role="alert" className="text-sm text-loss">
                {error}
              </span>
            )}
          </div>
        </form>

        {entries.length > 0 && (
          <ul className="divide-y divide-line">
            {visible.map((e) => (
              <li key={e.id} className="flex items-start gap-3 py-2.5 text-sm">
                <div className="w-28 shrink-0 text-xs text-muted">
                  {dateFormat.format(new Date(`${e.date}T12:00:00`))}
                  <div className="tabular-nums">{formatMinutes(e.minutes)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{FOCUSES[e.focus]}</div>
                  {e.note && <p className="text-muted break-words whitespace-pre-line">{e.note}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(e.id)}
                  aria-label={`Supprimer la séance du ${e.date}`}
                  className="text-xs text-muted hover:text-loss"
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
        {entries.length > 10 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="self-start text-xs text-accent hover:underline"
          >
            {showAll ? 'Voir moins' : `Voir les ${entries.length} séances`}
          </button>
        )}
      </div>
    </Card>
  )
}
