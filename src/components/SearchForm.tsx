import { useState, type FormEvent } from 'react'
import { PERIODS } from '../lib/games'
import { normalizeUsername } from '../lib/username'

export interface Search {
  username: string
  periodIndex: number
}

interface Props {
  loading: boolean
  initial?: Search
  onSubmit: (search: Search) => void
}

export function SearchForm({ loading, initial, onSubmit }: Props) {
  const [username, setUsername] = useState(initial?.username ?? '')
  const [periodIndex, setPeriodIndex] = useState(initial?.periodIndex ?? 2)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const clean = normalizeUsername(username)
    if (!clean) {
      setError('Pseudo invalide : 3 à 25 caractères, lettres, chiffres, _ ou -.')
      return
    }
    setError(null)
    onSubmit({ username: clean, periodIndex })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="text-muted">Pseudo chess.com</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={25}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="ex. hikaru"
          aria-invalid={error !== null}
          className="field"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Période</span>
        <select
          value={periodIndex}
          onChange={(e) => setPeriodIndex(Number(e.target.value))}
          className="field"
        >
          {PERIODS.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? 'Chargement…' : 'Charger'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-loss sm:basis-full">
          {error}
        </p>
      )}
    </form>
  )
}
