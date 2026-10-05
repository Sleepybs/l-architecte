# Moteur Stockfish (WASM)

Fichiers copiés tels quels depuis le paquet npm [`stockfish`](https://www.npmjs.com/package/stockfish)
version **19.0.0** (dossier `bin/`), variante « lite single-threaded » :

| Fichier | SHA-256 |
| --- | --- |
| `stockfish-19-lite-single.js` | `d3344124ab067fb0b90ee77873bb8e9fbf5fc01bc525fe714b0f942581e889e6` |
| `stockfish-19-lite-single.wasm` | `57ac2d72312aba346760e3f173f687a8c211208e97a87268436f7f0e10bb5387` |

- Projet : https://github.com/nmrugg/stockfish.js — Stockfish : https://github.com/official-stockfish/Stockfish
- Licence : GPL-3.0 (voir `COPYING.txt`)

Pourquoi ces fichiers sont copiés plutôt qu'installés via npm : le paquet pèse 161 Mo
(5 variantes du moteur) alors que l'app n'utilise que ces 2 fichiers (~1,8 Mo).
La variante mono-thread fonctionne sans en-têtes COOP/COEP, impossibles à configurer sur GitHub Pages.

Mise à jour : `npm pack stockfish`, extraire l'archive, copier les deux fichiers `bin/stockfish-XX-lite-single.*`
ici, mettre à jour ce tableau et le chemin dans `src/lib/engine.ts`.
