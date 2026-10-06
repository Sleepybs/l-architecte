/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Content-Security-Policy : le navigateur refusera tout ce qui n'est pas listé ici.
// Seules les deux API publiques sont autorisées en sortie (connect-src).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "worker-src 'self'", // Stockfish tourne dans un Web Worker servi par le site lui-même
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  'connect-src https://api.chess.com https://lichess.org',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

// La CSP n'est injectée qu'au build : en dev, Vite a besoin de scripts inline
// (rechargement à chaud) qu'une CSP stricte bloquerait.
function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      )
    },
  }
}

export default defineConfig({
  // Chemins relatifs : l'app fonctionne quel que soit le nom du dépôt GitHub Pages.
  base: './',
  plugins: [react(), tailwindcss(), cspPlugin()],
  build: {
    rolldownOptions: {
      output: {
        // Les bibliothèques changent rarement : dans des fichiers à part, le navigateur
        // les garde en cache même quand le code de l'app est mis à jour.
        codeSplitting: {
          groups: [
            { name: 'charts', test: /node_modules[\\/](recharts|d3-|victory-vendor)/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'node',
  },
})
