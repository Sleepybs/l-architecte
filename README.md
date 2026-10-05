# L’Architecte

> 🇫🇷 Français · [🇬🇧 English](#english)

Tracker de progression aux échecs, gratuit et open source. Tu entres ton pseudo chess.com, l’app récupère tes parties publiques et te montre ce qui t’empêche de progresser.

Rien à installer, pas de compte, pas de serveur : tout se passe dans ton navigateur.

**Démo :** _bientôt (GitHub Pages)_

## Utilisation

1. Entre ton pseudo chess.com et choisis une période.
2. Clique sur **Charger** : les archives mensuelles sont téléchargées une par une.
3. Choisis la cadence (Rapid, Blitz, Daily).

## État d’avancement

- [x] Récupération des parties (API publique chess.com, filtres cadence et période)
- [x] Tableau de bord (courbe d’elo, % de victoires, ouvertures, types de défaites)
- [x] Indicateurs « palier » (roque, sortie de la dame)
- [ ] Bouton « Analyser sur lichess »
- [ ] Cache local (IndexedDB) et bouton « Effacer mes données »

## Développement

```bash
npm install
npm run dev      # serveur de développement
npm test         # tests (Vitest)
npm run lint     # ESLint
npm run build    # build de production dans dist/
```

## Données et vie privée

- Seules les API publiques de chess.com (lecture seule) et de lichess sont contactées.
- Aucune connexion à un compte, aucun cookie, aucun traceur, aucun serveur à nous.
- Requêtes séquentielles et attente automatique si chess.com répond « trop de requêtes » (429).

## Licence

[GPL-3.0](LICENSE). Projet non affilié à Chess.com ni à Lichess.

## Crédits

- [chess.js](https://github.com/jhlywa/chess.js) (BSD-2-Clause)
- [React](https://react.dev) (MIT), [Vite](https://vite.dev) (MIT), [Tailwind CSS](https://tailwindcss.com) (MIT), [Recharts](https://recharts.org) (MIT)
- Icône : dessin original du projet (GPL-3.0)

---

## English

Free and open source chess progress tracker. Enter your chess.com username: the app fetches your public games and shows what keeps you from improving. Nothing to install, no account, no server — everything runs in your browser.

**Usage:** enter your username, pick a period, click **Charger** (Load), then choose a time control.

**Privacy:** only the official public chess.com API (read-only) and lichess are contacted. No account login, no cookies, no tracking.

**License:** [GPL-3.0](LICENSE). Not affiliated with Chess.com or Lichess.
