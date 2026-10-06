import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Élément #root introuvable dans index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker (appli installable et utilisable hors ligne) : seulement en production,
// pour ne pas garder en cache des fichiers de développement.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined)
  })
}
