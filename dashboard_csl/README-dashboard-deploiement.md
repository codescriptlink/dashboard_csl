# Tableau de bord Jwar-code — guide de déploiement

Ce pack ajoute un fichier `dashboard.html` qui sert de page d'accueil/connexion avant
d'ouvrir le projet `index.html`. Il gère deux choses séparées :

1. **Comptes utilisateurs "maison"** (pseudo + mail + mot de passe), stockés dans une
   feuille Google Sheet nommée `iduser_account`, via un petit backend Google Apps Script
   gratuit (`AppsScript-Code.gs`).
2. **Connexion Google optionnelle** pour parcourir en direct un dossier Google Drive
   contenant le projet (vrai accès à l'API Drive).

Place `dashboard.html` **dans le même dossier** que `index.html`, `style.css`, `script.js`.
Les utilisateurs ouvrent `dashboard.html` en premier ; le bouton "Ouvrir le projet →"
les amène ensuite sur `index.html`.

## Étape 1 — Créer le backend de comptes (Google Apps Script + Google Sheet)

1. Va sur https://script.google.com et clique sur **Nouveau projet**.
2. Supprime le contenu par défaut de `Code.gs` et colle le contenu du fichier
   `AppsScript-Code.gs` fourni.
3. Clique sur **Exécuter** une première fois (menu ▶) pour autoriser le script à accéder
   à Google Sheets — accepte les permissions demandées avec ton compte Google.
   - Le script crée automatiquement une feuille nommée **iduser_account** dans le
     classeur Google Sheets lié au projet Apps Script, avec les colonnes :
     `id, pseudo, email, password_hash, created_at`.
4. Clique sur **Déployer → Nouveau déploiement**.
   - Type : **Application Web**.
   - Exécuter en tant que : **Moi**.
   - Qui a accès : **Tout le monde** (pour que tous les utilisateurs puissent
     s'inscrire/se connecter, accessible à tout le monde).
5. Copie l'URL générée (se termine par `/exec`).
6. Ouvre `dashboard.html` dans le navigateur, colle cette URL dans le champ
   **"URL du backend Apps Script"**, clique OK.

➡️ Les mots de passe sont stockés **hachés** (SHA-256 + sel), jamais en clair, dans la
feuille `iduser_account`. C'est suffisant pour un usage personnel/petit groupe, mais reste
un système simple : pour une vraie mise en production avec des données sensibles, un
backend avec une base de données dédiée et un hachage salé par utilisateur (bcrypt/argon2)
serait préférable.

## Étape 2 — (Optionnel) Activer l'accès Google Drive

Pour que le tableau de bord puisse lister en direct le contenu d'un dossier Google Drive
(au lieu d'afficher uniquement la liste statique des fichiers du projet) :

1. Va sur https://console.cloud.google.com/apis/credentials
2. Crée un identifiant OAuth (Type : Application Web), comme pour le mode "Cloud (Google)"
   déjà documenté dans `README-deploiement.md`.
3. Dans **Origines JavaScript autorisées**, ajoute l'URL où `dashboard.html` sera hébergé.
4. Active l'API **Google Drive API** dans "APIs & Services → Bibliothèque".
5. Copie le Client ID, colle-le dans le champ **"Client ID Google OAuth"** de
   `dashboard.html`.
6. (Optionnel) Récupère l'ID du dossier Drive contenant le projet — c'est la partie de
   l'URL après `/folders/` quand tu ouvres le dossier dans Google Drive — et colle-le
   dans **"ID du dossier Google Drive"**.
7. Clique sur **"Connecter Google (Drive)"** : une fenêtre Google s'ouvre pour autoriser
   l'accès en lecture seule à ton Drive, puis le dossier s'affiche dans le tableau de bord.

Sans cette étape, le tableau de bord affiche simplement la liste des fichiers statiques
du projet (`index.html`, `style.css`, `script.js`, etc.), et le bouton "Ouvrir le projet"
fonctionne quand même normalement.

## Étape 3 — Utilisation côté utilisateurs

1. L'utilisateur ouvre `dashboard.html`.
2. Il clique sur **"Se connecter"** → une fenêtre s'ouvre avec deux onglets :
   - **Se connecter** : mail + mot de passe.
   - **S'inscrire** : pseudo + mail + mot de passe (vérifie automatiquement si le mail
     existe déjà dans `iduser_account` avant de créer le compte).
3. Une fois connecté, son **pseudo apparaît en haut à droite** du tableau de bord.
   En survolant le pseudo avec la souris, une petite fenêtre apparaît avec le pseudo,
   le mail, et un bouton **"Se déconnecter"**.
4. En cliquant sur **"Ouvrir le projet →"**, il est redirigé vers `index.html`. La même
   pastille pseudo (avec carte au survol et déconnexion) apparaît aussi en haut de
   l'éditeur jwar-code, car la session est partagée via le navigateur (stockage local).

## Notes importantes

- La session de connexion (`localStorage`, clé `jwarcode-session`) reste **propre à
  chaque navigateur/appareil** : un utilisateur connecté sur son PC ne sera pas connecté
  automatiquement sur son téléphone. C'est le comportement normal d'une appli statique
  sans cookies de session serveur.
- Cette connexion "pseudo/mail/mot de passe" est **indépendante** de la connexion Google
  déjà présente dans `index.html` (bouton "Connecter Google ▾"), qui sert uniquement au
  mode IA "Cloud (Google)" décrit dans `README-deploiement.md`. Les deux systèmes
  cohabitent sans conflit.
- Pour rendre `dashboard.html` accessible "à tout le monde", héberge simplement tous les
  fichiers (`dashboard.html`, `index.html`, `style.css`, `script.js`, `worker.js`) sur un
  hébergement statique gratuit (GitHub Pages, Netlify, Vercel, Google Sites, etc.) — le
  backend Apps Script et l'API Drive fonctionnent depuis n'importe quel domaine tant que
  le Client ID Google a bien cette origine autorisée (étape 2.3).
