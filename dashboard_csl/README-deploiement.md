# Activer le mode "Cloud (Google)" — guide de déploiement

Ce mode permet à tes utilisateurs de se connecter avec un compte Google et d'utiliser
Claude (Sonnet 4.6 ou Haiku 4.5) **sans saisir de clé API**, avec un quota gratuit
quotidien que tu finances (clé API à toi, gardée secrète côté serveur).

Il faut déployer un petit serveur relais (`worker.js`), gratuit jusqu'à un certain
volume sur Cloudflare Workers. Sans ce déploiement, le mode "Cloud (Google)" affichera
un message d'erreur — le mode "Local" et "Cloud (ma clé)" continuent eux à fonctionner
sans rien déployer.

## Étape 1 — Créer un identifiant OAuth Google (gratuit)

1. Va sur https://console.cloud.google.com/apis/credentials
2. Crée un projet (ou utilise un projet existant).
3. "Créer des identifiants" → "ID client OAuth" → Type d'application : **Application Web**.
4. Dans "Origines JavaScript autorisées", ajoute l'URL où ton fichier `index.html` sera hébergé
   (ex: `https://monsite.com` ou `http://localhost:5500` pour tester en local).
5. Copie le **Client ID** généré (il ressemble à `123456-abc.apps.googleusercontent.com`).
6. Ouvre `script.js`, trouve la ligne :
   ```js
   const GOOGLE_CLIENT_ID = "REMPLACE_PAR_TON_CLIENT_ID.apps.googleusercontent.com";
   ```
   et remplace par ton vrai Client ID.

## Étape 2 — Déployer le serveur relais sur Cloudflare Workers (gratuit)

1. Crée un compte gratuit sur https://dash.cloudflare.com
2. Installe l'outil en ligne de commande (nécessite Node.js) :
   ```bash
   npm install -g wrangler
   wrangler login
   ```
3. Dans un dossier séparé, initialise le projet :
   ```bash
   mkdir jwar-relay && cd jwar-relay
   cp /chemin/vers/worker.js .
   ```
4. Crée un fichier `wrangler.toml` à côté de `worker.js` :
   ```toml
   name = "jwar-relay"
   main = "worker.js"
   compatibility_date = "2024-01-01"

   [vars]
   GOOGLE_CLIENT_ID = "TON_CLIENT_ID.apps.googleusercontent.com"

   [[kv_namespaces]]
   binding = "QUOTA"
   id = "REMPLACE_APRES_ETAPE_5"
   ```
5. Crée le namespace KV qui stocke les compteurs de quota :
   ```bash
   wrangler kv namespace create QUOTA
   ```
   Cette commande affiche un `id`. Colle-le dans `wrangler.toml` à la place de
   `REMPLACE_APRES_ETAPE_5`.
6. Ajoute ta clé API Anthropic comme secret (jamais visible publiquement) :
   ```bash
   wrangler secret put ANTHROPIC_API_KEY
   ```
   (colle ta clé `sk-ant-...` quand demandé)
7. Déploie :
   ```bash
   wrangler deploy
   ```
   Tu obtiens une URL du type `https://jwar-relay.tonpseudo.workers.dev`.

## Étape 3 — Connecter l'app à ton serveur

1. Ouvre `index.html` dans le navigateur.
2. En haut à droite de l'application, clique sur le bouton de connexion Google (toujours
   visible, indépendamment du mode IA choisi) et connecte-toi. Ton compte reste affiché
   dans la barre du haut (photo + email + bouton Déconnexion) tant que tu es connecté.
3. Va dans l'onglet IA → "Cloud (Google)".
4. Colle l'URL obtenue à l'étape 2 (ex: `https://jwar-relay.tonpseudo.workers.dev`)
   dans le champ "URL de ton serveur relais", clique OK.
5. Choisis Sonnet 4.6 ou Haiku 4.5 dans le sélecteur de modèle, puis discute normalement —
   le mode "Cloud (Google)" réutilise automatiquement le compte connecté en haut de l'app,
   pas besoin de te reconnecter.

## Quota et coûts

- Par défaut, chaque utilisateur Google a droit à **30 messages gratuits par jour**
  (modifiable via `DAILY_FREE_LIMIT` dans `worker.js`).
- Les appels au-delà de ce quota sont refusés, donc tes coûts API restent prévisibles.
- Cloudflare Workers est gratuit jusqu'à 100 000 requêtes/jour ; le KV gratuit
  jusqu'à 100 000 lectures et 1 000 écritures/jour, largement suffisant pour démarrer.

## Sécurité

- La clé API Anthropic n'est **jamais** envoyée au navigateur : elle reste un secret
  Cloudflare côté serveur.
- Le jeton Google est vérifié à chaque requête (audience + email vérifié) avant tout
  appel à Claude.
- En production, remplace `ALLOWED_ORIGIN = "*"` dans `worker.js` par l'URL exacte de
  ton site pour empêcher d'autres sites d'utiliser ton quota.
