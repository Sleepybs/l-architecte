import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

// localStorage peut être indisponible (navigation privée…) : on ne plante jamais.
function readTheme(): Theme {
  try {
    return localStorage.getItem('theme') === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // ignoré
    }
  }, [theme])

  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="rounded-md px-2 py-1 text-sm text-muted hover:text-fg"
      aria-label={`Passer en thème ${next === 'dark' ? 'sombre' : 'clair'}`}
    >
      {theme === 'dark' ? '☀ Clair' : '☾ Sombre'}
    </button>
  )
}
