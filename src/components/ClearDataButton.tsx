import { useState } from 'react'
import { dbDestroy } from '../lib/db'
import { lichessIds } from '../lib/lichessIds'

/** Supprime tout ce que l'app a stocké sur cet appareil. */
export function ClearDataButton({ onCleared }: { onCleared: () => void }) {
  const [done, setDone] = useState(false)

  async function handleClick() {
    const ok = window.confirm(
      'Effacer toutes les données stockées sur cet appareil (parties en cache, analyses, journal, préférences) ?',
    )
    if (!ok) return
    await dbDestroy().catch(() => undefined)
    try {
      localStorage.clear()
    } catch {
      // stockage indisponible : rien à effacer
    }
    lichessIds.clearMemory()
    onCleared()
    setDone(true)
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className="text-xs text-muted underline-offset-2 hover:text-loss hover:underline"
    >
      {done ? 'Données effacées ✓' : 'Effacer mes données'}
    </button>
  )
}
