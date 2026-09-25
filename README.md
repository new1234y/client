# Chase GPS — client

Client web de **Chase GPS**, un jeu de poursuite grandeur nature avec
géolocalisation, carte temps réel et salons multijoueurs. L'interface est
construite avec Vite, React et Tailwind CSS.

Production : **https://chatgame2026.vercel.app/**

## Prérequis

- Node.js 20 ou une version LTS récente
- npm 10+
- Un serveur Chase GPS compatible Socket.IO pour les parties en temps réel
- Un projet Supabase pour l'historique des parties

## Installation et développement

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Le serveur Vite est disponible sur <http://localhost:5173>. En développement,
les routes `/api` et `/health` sont proxifiées vers
`http://localhost:3001`. Le fallback du client Socket.IO utilise également
`http://localhost:3001`, ce qui permet de démarrer sans configuration
supplémentaire.

## Variables d'environnement

Les variables `VITE_*` sont injectées dans le bundle navigateur : ne jamais y
placer un secret serveur.

| Variable | Rôle | Exemple |
| --- | --- | --- |
| `VITE_PUBLIC_URL` | URL canonique utilisée pour les liens d'invitation et de récapitulatif | `https://chatgame2026.vercel.app/` |
| `VITE_SOCKET_URL` | URL du serveur Socket.IO/backend | `http://localhost:3001` |
| `VITE_SUPABASE_URL` | URL publique du projet Supabase | `https://<projet>.supabase.co` |
| `VITE_SUPABASE_KEY` | Clé anon publique Supabase | `ey...` |
| `VITE_MAPBOX_TOKEN` | Token public Mapbox, facultatif | `pk...` |
| `VITE_OSM_API_KEY` | Clé fournisseur de fond de carte, facultative | `...` |

Sans `VITE_PUBLIC_URL`, le client utilise l'origine locale en mode
développement et l'URL de production ci-dessus dans un build.

## Scripts

| Commande | Usage |
| --- | --- |
| `npm run dev` | Lance Vite en mode développement |
| `npm run build` | Produit le bundle de production dans `dist/` |
| `npm run preview` | Sert localement le dernier build |

## Déploiement web

Le projet est prêt pour Vercel avec le preset **Vite** :

1. Importer le dépôt `new1234y/client`.
2. Utiliser `npm run build` comme commande de build et `dist` comme répertoire de sortie.
3. Définir les variables d'environnement du tableau ci-dessus dans les environnements
   Preview et Production. En production, définir
   `VITE_PUBLIC_URL=https://chatgame2026.vercel.app/`.
4. Vérifier que le backend autorise le domaine Vercel pour les connexions
   Socket.IO et les requêtes Supabase.

Les fichiers `.env*`, `dist/`, `.expo/` et `node_modules/` sont ignorés par Git.
Ne pas committer les fichiers d'environnement locaux.

## Architecture

```text
src/
├── main.jsx                 # Point d'entrée React et routeur
├── App.jsx                  # Orchestration de la partie et des routes
├── components/              # Pages, écrans de jeu et composants UI
├── hooks/                   # Géolocalisation, orientation, temps serveur
├── context/                 # État global (thème)
├── lib/                     # Backend, configuration, cartes et helpers
│   ├── appConfig.js         # URL publique et URL Socket.IO
│   ├── backend.js           # Réveil du backend et connexion
│   └── map/                 # Fonds, préférences et intégration cartographique
└── index.css                # Styles globaux et utilitaires Tailwind
```

Les données de partie transitent par Socket.IO. Supabase est utilisé pour
consulter l'historique et les récapitulatifs. Mapbox, Leaflet, OpenStreetMap
et les services associés fournissent les cartes selon la configuration
disponible.

## Navigateur et mobile

- Autoriser la géolocalisation et les notifications lorsque le jeu le demande.
- Sur mobile, utiliser HTTPS en production : les permissions de géolocalisation,
  boussole et partage sont limitées sur une origine non sécurisée.
- L'application est installable comme PWA et est prévue principalement en
  orientation portrait. Le mode plein écran et les zones sûres iOS sont gérés
  par les styles et le manifeste.
- Sur iOS, ajouter la PWA à l'écran d'accueil pour bénéficier au mieux des
  notifications et du comportement plein écran. Le partage natif peut être
  indisponible selon le navigateur ; le QR code et le lien restent disponibles.
- Pour une application native Capacitor, construire d'abord avec
  `npm run build`, puis utiliser `npx cap sync` avec `webDir: "dist"`.

## Références

- Page d'accueil : `src/components/HomePage.jsx`
- Configuration locale : `.env.example`
- Configuration Vite/PWA : `vite.config.js`
- Configuration Capacitor : `capacitor.config.json`
