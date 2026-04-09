# Design — Likes & Favoris

**Date** : 2026-04-09
**Statut** : validé

## Résumé

Deux systèmes distincts :
- **Like** = signal social public (compteur visible par tous sur SongCard + page détail, tri catalogue "les plus aimés")
- **Favoris** = collection privée (liste personnelle de chants sauvegardés, page dédiée `/favoris`)

Les deux nécessitent un compte. Si l'utilisateur n'est pas connecté, clic → redirect `/connexion`.

Le like porte sur la **chanson** (pas sur les grilles d'accords individuelles).

---

## Schéma DB

### Table `likes` (nouvelle)

| Colonne      | Type         | Contrainte                                  |
|--------------|--------------|---------------------------------------------|
| `id`         | uuid         | PK, default gen_random_uuid()               |
| `user_id`    | uuid         | FK → profiles.id, NOT NULL                  |
| `song_id`    | uuid         | FK → songs.id ON DELETE CASCADE, NOT NULL    |
| `created_at` | timestamptz  | default now()                               |
|              |              | UNIQUE(user_id, song_id)                    |

### Table `favorites` (nouvelle)

| Colonne      | Type         | Contrainte                                  |
|--------------|--------------|---------------------------------------------|
| `id`         | uuid         | PK, default gen_random_uuid()               |
| `user_id`    | uuid         | FK → profiles.id, NOT NULL                  |
| `song_id`    | uuid         | FK → songs.id ON DELETE CASCADE, NOT NULL    |
| `created_at` | timestamptz  | default now()                               |
|              |              | UNIQUE(user_id, song_id)                    |

### Colonne ajoutée sur `songs`

`likes_count INTEGER DEFAULT 0 NOT NULL`

### Trigger Postgres

Fonction `update_likes_count` déclenchée sur INSERT/DELETE dans `likes` :
- INSERT → `UPDATE songs SET likes_count = likes_count + 1 WHERE id = NEW.song_id`
- DELETE → `UPDATE songs SET likes_count = likes_count - 1 WHERE id = OLD.song_id`

### RLS

- `likes` / `favorites` : SELECT pour tous, INSERT/DELETE pour `auth.uid() = user_id`
- Pas d'UPDATE (on insère ou supprime uniquement)

---

## Composants UI

### `LikeButton`

- Coeur outline si pas liké, coeur plein + couleur si liké
- Compteur à côté (ex: "12")
- Click : si connecté → toggle like (optimistic update), si pas connecté → redirect `/connexion`
- Taille adaptative : compact sur `SongCard`, plus grand sur page détail
- Utilisé sur : `SongCard` + page détail chanson

### `FavoriteButton`

- Icône bookmark outline / plein
- Pas de compteur (collection privée)
- Click : même logique auth (redirect si pas connecté)
- Utilisé sur : page détail chanson uniquement

### `FavoritesPage` (`src/app/favoris/page.tsx`)

- Liste les chants sauvegardés avec `SongCard` (qui inclut `LikeButton`)
- Tri par date d'ajout (plus récent en premier)
- État vide : message + CTA vers le catalogue
- Protégée : redirect `/connexion` si pas connecté

### Tri catalogue (`/chansons`)

- Nouvelle option de tri : "Les plus aimés" (`ORDER BY likes_count DESC`)
- Query param : `?sort=popular`
- Tri par défaut inchangé

---

## Data flow

### Mutations

Côté client uniquement (même pattern que `AddToPlaylistButton`) :
- `createClient()` Supabase browser → INSERT/DELETE sur `likes` ou `favorites`
- RLS assure la sécurité, pas besoin de route API intermédiaire

### Optimistic updates

- `LikeButton` : toggle immédiat du coeur + incrémente/décrémente le compteur localement. Rollback si erreur Supabase.
- `FavoriteButton` : toggle immédiat de l'icône. Rollback si erreur.

### État initial (l'utilisateur a-t-il déjà liké/favori ?)

- **Page détail chanson (SSR)** : query server-side fetch `likes` et `favorites` filtrés par `user_id`, passe `isLiked` / `isFavorited` en props
- **SongCard (catalogue, artiste)** : query batch côté serveur récupère tous les `song_id` likés par l'utilisateur, distribués aux `SongCard` par le parent

---

## Navigation et intégration

### Liens vers "Mes favoris"

- `UserMenu` (desktop) : lien ajouté dans le dropdown, entre "Mes contributions" et "Déconnexion"
- `MobileMenu` : même ajout, visible uniquement si connecté

### Hors scope

- Système de playlists (indépendant)
- Votes sur les grilles d'accords (`chord_votes`)
- Admin panel
