# Feature: Playlists

**Date:** 2026-04-08
**Statut:** Validé — prêt pour implémentation

## Résumé

Système de playlists permettant aux utilisateurs de Fenua Chords d'organiser des chants, naviguer séquentiellement avec un mode lecture optimisé, et partager via QR code/lien. Quota d'une playlist par compte avec monétisation future ("Bientôt disponible").

## Modèle de données

### Table `playlists`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `id` | uuid | PK, gen_random_uuid() |
| `owner_id` | uuid | FK → profiles.id, NOT NULL, ON DELETE CASCADE, **UNIQUE** (1 par user) |
| `title` | text | NOT NULL, max 100 chars |
| `description` | text | nullable |
| `visibility` | enum `playlist_visibility` | 'private' \| 'link' \| 'public', default 'private' |
| `share_token` | text | UNIQUE, NOT NULL, nanoid ~12 chars, généré à la création |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | default now(), trigger on update |

### Table `playlist_songs`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `id` | uuid | PK, gen_random_uuid() |
| `playlist_id` | uuid | FK → playlists.id, ON DELETE CASCADE |
| `song_id` | uuid | FK → songs.id, ON DELETE CASCADE |
| `position` | integer | NOT NULL |
| `added_at` | timestamptz | default now() |

Contrainte : `UNIQUE(playlist_id, song_id)` — pas de doublon.

### Table `playlist_follows`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `id` | uuid | PK, gen_random_uuid() |
| `follower_id` | uuid | FK → profiles.id, ON DELETE CASCADE |
| `playlist_id` | uuid | FK → playlists.id, ON DELETE CASCADE |
| `followed_at` | timestamptz | default now() |

Contrainte : `UNIQUE(follower_id, playlist_id)`.

### RLS (Row Level Security)

- **playlists** : owner peut SELECT/INSERT/UPDATE/DELETE ; autres peuvent SELECT si `visibility IN ('public', 'link')`
- **playlist_songs** : suit les permissions de la playlist parente (owner = full, autres = SELECT si playlist accessible)
- **playlist_follows** : un user peut INSERT/DELETE ses propres follows ; SELECT sur les playlists accessibles

## Architecture — Routes

| Route | Type | Description |
|-------|------|-------------|
| `/playlists` | Protégée (auth) | Page "Ma playlist" — création si aucune, gestion si existante + playlists suivies |
| `/playlists/[shareToken]` | Publique | Vue partagée lecture seule d'une playlist |
| `/playlists/[shareToken]/lecture` | Publique | Mode lecture plein écran |

L'URL publique utilise le `share_token` (pas l'UUID interne) pour le partage et le QR code.

## Architecture — Composants

| Composant | Rôle |
|-----------|------|
| `PlaylistManager` | Page `/playlists` — CRUD playlist, drag & drop réordonnancement, liste des chants |
| `PlaylistPublicClient` | Page `/playlists/[token]` — vue partagée, boutons Copier/Suivre/Lecture |
| `PlaylistReaderClient` | Mode lecture plein écran — accords, transposition, auto-scroll, nav prev/next |
| `PlaylistMiniBar` | Barre sticky bottom (style Spotify) — visible sur toutes les pages quand playlist active |
| `AddToPlaylistButton` | Bouton contextuel sur pages chanson (`/chansons/[slug]`) et catalogue (`/chansons`) |
| `PlaylistShareModal` | Modal avec QR code + lien + sélecteur visibilité |
| ~~`PlaylistQuotaBanner`~~ | *(non implémenté dans le MVP — prévu futur)* |

## Gestion d'état — Playlist active

- **React Context** (`PlaylistContext`) dans le layout racine
- Stocke : `activePlaylist`, `currentIndex`, `songs[]`
- Persisté en `sessionStorage` pour survivre aux navigations Next.js App Router
- La mini-barre lit ce context et s'affiche conditionnellement
- Pas de state manager externe (Zustand, Redux) — Context + sessionStorage suffit

## Mode lecture plein écran

### Rendu optimisé

- **Pas de header/footer** — zéro distraction
- **Taille de police ajustable** — boutons A-/A/A+ dans la barre du haut
- **Transposition** — contrôles -1/+1 intégrés dans la barre du haut
- **Wake Lock API** — l'écran ne s'éteint pas pendant la lecture
- **Affichage brut** — le contenu de la fiche d'accords est rendu tel quel, sans découpage en sections (le formulaire de contribution ne capture pas la structure couplet/refrain)
- **Contenu maximisé** — UI minimale pour laisser un maximum d'espace aux accords/paroles

### Auto-scroll

- **Play/Pause** — démarre/stoppe le défilement automatique
- **Contrôles vitesse** — boutons -/+ pour ajuster en temps réel
- **3-5 paliers de vitesse** — de très lent (ballades) à rapide (bringue)
- **Indicateur visuel** — icône montrant que le scroll est actif + vitesse courante
- **Pause automatique** si l'utilisateur touche/scroll manuellement ; reprise au tap sur Play
- **Vitesse persistée** en `sessionStorage` pour ne pas re-régler à chaque chant
- **Implémentation** : `requestAnimationFrame` + `window.scrollBy()` modulé par le palier de vitesse

### Navigation

- Barre en bas : boutons Précédent / Suivant avec nom du chant adjacent
- Indicateur de position : "2/8"
- Bouton "Quitter" pour revenir à la page précédente

## Page classique enrichie

Quand une playlist est active et que l'utilisateur navigue sur les pages chanson classiques (`/chansons/[slug]`) :

- **Mini-barre sticky en bas** (style Spotify) affichant :
  - Nom de la playlist + position courante ("3/8 — Pua Noanoa")
  - Boutons Précédent / Suivant
  - Bouton "Plein écran" pour basculer en mode lecture
- La mini-barre disparaît quand aucune playlist n'est active

## Ajout de chants à la playlist

Trois points d'entrée :

1. **Page chanson** (`/chansons/[slug]`) — bouton "Ajouter à ma playlist"
2. **Page catalogue** (`/chansons`) — bouton d'ajout sur chaque carte de chant
3. **Page playlist** (`/playlists`) — recherche intégrée pour ajouter des chants

Comportement :
- Si l'utilisateur n'a pas de playlist → proposition de créer sa playlist d'abord
- Si le chant est déjà dans la playlist → bouton grisé "Déjà ajouté"
- Le chant est ajouté en dernière position

## Partage et QR Code

### Modal de partage

Accessible via bouton "Partager" sur la page de gestion playlist :

- **QR Code** généré côté client avec `qrcode.react`, encodant l'URL `fenua-chords.com/playlists/[shareToken]`
- **Bouton "Télécharger"** — export PNG du QR code
- **Bouton "Copier le lien"** — copie l'URL dans le presse-papier
- **Sélecteur de visibilité** intégré :
  - Privée → message "Passe ta playlist en Lien direct ou Public pour la partager"
  - Lien direct → QR + lien actifs, playlist non indexée
  - Public → QR + lien actifs, visible dans le futur catalogue

### Accès visiteur (non connecté)

- Voit la playlist complète en lecture seule
- Peut lancer le mode lecture plein écran
- Boutons "Copier" et "Suivre" affichent "Connecte-toi pour..."

### Accès utilisateur connecté

- Lecture seule + bouton "Copier dans ma playlist"
  - Si pas de playlist → la copie crée sa playlist (titre + chants copiés)
  - Si déjà une playlist → message "Tu as déjà une playlist. Bientôt disponible : playlists illimitées"
- Bouton "Suivre" → ajoute aux playlists suivies

## Suivi de playlists

- **Suivre** = raccourci d'accès rapide, pas d'abonnement avec notifications
- La playlist suivie apparaît dans la section "Playlists suivies" sur `/playlists`
- Les modifications de l'owner se reflètent en temps réel (c'est la même playlist, pas une copie)
- **Pas de limite** sur le nombre de playlists suivies
- Un user peut se désabonner à tout moment

## Monétisation et quotas

### MVP

- **1 playlist par compte** — contrainte DB `UNIQUE(owner_id)`
- Pas de bouton "Créer une 2ème playlist" — l'utilisateur est redirigé vers sa playlist existante
- **Bannière discrète** sur la page playlist : "Envie de plus de playlists ? Bientôt disponible"
- Style sobre, pas de CTA agressif

### Page "Ma playlist" — structure

- Section principale : "Ma playlist" (éditable)
- Section secondaire : "Playlists suivies" (liste, lecture seule, liens)

### Futur (hors MVP)

- Plans payants avec quotas élargis (3, 10, illimité)
- Rien n'est codé pour ça maintenant, juste le message "Bientôt disponible"

## Évolutions futures (hors scope MVP)

- **Structure couplet/refrain** dans le formulaire de contribution → labels de sections en mode lecture
- **Sections collapsibles** en mode lecture (masquer les parties déjà jouées)
- **Notifications** de mise à jour sur les playlists suivies
- **Catalogue public** de playlists (browsable)
- **Plans payants** avec quotas de playlists
