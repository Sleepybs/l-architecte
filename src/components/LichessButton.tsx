import { useState } from 'react'
import type { Game } from '../lib/games'
import { importToLichess, LichessError, lichessUrl } from '../lib/lichess'
import { lichessIds } from '../lib/lichessIds'

type State = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string }

export function LichessButton({ game }: { game: Game }) {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [id, setId] = useState<string | null>(() => lichessIds.peek(game.id))

  async function handleClick() {
    if (id) {
      window.open(lichessUrl(id, game.color), '_blank', 'noopener,noreferrer')
      return
    }
    // Ouvert immédiatement (dans le clic) pour ne pas être bloqué comme popup.
    const win = window.open('about:blank', '_blank')
    setState({ status: 'loading' })
    try {
      const newId = (await lichessIds.get(game.id)) ?? (await importToLichess(game.pgn))
      await lichessIds.set(game.id, newId)
      setId(newId)
      setState({ status: 'idle' })
      const url = lichessUrl(newId, game.color)
      if (win) {
        win.opener = null // l'onglet lichess ne peut pas agir sur notre page
        win.location.href = url
      }
    } catch (err) {
      win?.close()
      setState({
        status: 'error',
        message: err instanceof LichessError ? err.message : 'Import impossible.',
      })
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={state.status === 'loading'}
        className="rounded-md border border-line px-2 py-1 text-xs whitespace-nowrap text-muted transition-colors hover:border-accent hover:text-fg disabled:cursor-wait"
      >
        {state.status === 'loading'
          ? 'Import…'
          : id
            ? 'Ouvrir sur lichess ↗'
            : 'Analyser sur lichess'}
      </button>
      {state.status === 'error' && (
        <span role="alert" className="text-xs text-loss">
          {state.message}
        </span>
      )}
    </span>
  )
}
