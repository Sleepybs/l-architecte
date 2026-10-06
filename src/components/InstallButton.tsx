import { useEffect, useState } from 'react'

// Événement non standard (Chrome, Edge, Samsung Internet…) : pas encore dans les types du DOM.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Bouton « Installer » : n'apparaît que si le navigateur propose l'installation de l'appli. */
export function InstallButton() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault() // on garde l'événement pour afficher notre propre bouton
      setPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setPrompt(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!prompt) return null
  return (
    <button
      type="button"
      onClick={() => {
        void prompt.prompt()
        void prompt.userChoice.finally(() => setPrompt(null))
      }}
      className="rounded-md border border-accent px-2.5 py-1 text-sm text-accent hover:bg-accent hover:text-bg"
    >
      Installer l’appli
    </button>
  )
}
