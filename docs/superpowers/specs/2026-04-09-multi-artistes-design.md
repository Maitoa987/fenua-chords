# Design : Multi-artistes par chanson

**Date** : 2026-04-09
**Statut** : Validé

## Contexte

Actuellement chaque chanson a un seul artiste via `songs.artist_id` (FK directe, NOT NULL). On veut permettre plusieurs artistes par chanson, sans hiérarchie (relation égalitaire).

## Décisions

- Relation many-to-many via table de jonction `song_artists`
- Pas de hiérarchie entre artistes (pas de rôle "principal" / "featuring")
- Pas de limite au nombre d'artistes par chanson
- Affichage en tags/badges cliquables
- Artistes modifiables à la création ET à l'édition
- URLs inchangées (`/chansons/[slug]`, `/artistes/[slug]`)

## Schema DB

### Nouvelle table `song_artists`

```sql
CREATE TABLE song_artists (
  song_id    uuid REFERENCES songs(id) ON DELETE CASCADE,
  artist_id  uuid REFERENCES artists(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (song_id, artist_id)
);

CREATE INDEX idx_song_artists_artist ON song_artists(artist_id);
```

### RLS

- Lecture publique (SELECT) — même politique que `songs`
- Écriture (INSERT/UPDATE/DELETE) — créateur de la chanson + admin

### Migration des données

```sql
INSERT INTO song_artists(song_id, artist_id)
  SELECT id, artist_id FROM songs WHERE artist_id IS NOT NULL;

ALTER TABLE songs DROP COLUMN artist_id;
```

L'index `idx_songs_artist` est supprimé avec la colonne.

### Merge admin (nouvelle version)

```sql
CREATE OR REPLACE FUNCTION merge_artists(source_id uuid, target_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO song_artists(song_id, artist_id)
    SELECT song_id, target_id FROM song_artists WHERE artist_id = source_id
    ON CONFLICT DO NOTHING;
  DELETE FROM song_artists WHERE artist_id = source_id;
  DELETE FROM artists WHERE id = source_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Types TypeScript

### Nouvelle interface

```typescript
export interface SongArtist {
  song_id: string
  artist_id: string
  created_at: string
}
```

### Modifications

- `Song` : retirer `artist_id`
- `SongFormData` : `artist: ArtistValue | null` → `artists: ArtistValue[]`

## Composants

### `ArtistAutocomplete` → multi-select

Transformation du composant existant :

- **Props** : `value: ArtistValue[]`, `onChange: (artists: ArtistValue[]) => void`
- **UX** : tags inline avec "x" pour retirer, input reste actif pour ajouter
- **Dropdown** : identique à l'actuel (recherche Supabase + option "nouveau")
- **Validation** : minimum 1 artiste requis

### Nouveau composant `ArtistTags`

Composant d'affichage réutilisable :

- **Props** : `artists: { name: string, slug: string }[]`
- **Rendu** : badges cliquables, chacun un `<Link href={/artistes/${slug}}>`
- **Utilisé sur** : liste chansons, détail chanson, playlists, page artiste

## Requêtes Supabase

### Pattern de requête

```typescript
// Avant
.select("id, title, slug, artists(name, slug)")

// Après
.select("id, title, slug, song_artists(artists(name, slug))")
```

### Pages impactées

| Fichier | Changement |
|---------|-----------|
| `src/app/chansons/page.tsx` | Requête + affichage multi-artistes |
| `src/app/chansons/[slug]/page.tsx` | Requête + affichage tags artistes |
| `src/app/artistes/[slug]/page.tsx` | Requête via `song_artists` au lieu de `songs.artist_id` |
| `src/app/playlists/[shareToken]/page.tsx` | Requête nested + affichage |
| `src/app/playlists/page.tsx` | Requête nested si affichage artiste |
| `src/app/admin/artistes/page.tsx` | Count via `song_artists`, merge mis à jour |
| `src/app/contribuer/page.tsx` | Boucle résolution artistes + insert `song_artists` |
| `src/app/contribuer/[id]/edit/page.tsx` | Chargement artistes existants + modification |
| `src/components/SongForm.tsx` | `artists: ArtistValue[]` + multi-autocomplete |
| `src/components/ArtistAutocomplete.tsx` | Refonte multi-select |
| `src/types/database.ts` | `SongArtist`, `Song` sans `artist_id` |

## Flow de contribution

1. Utilisateur saisit 1+ artistes via le multi-autocomplete
2. Pour chaque artiste :
   - Si `id` existe → utiliser directement
   - Sinon → recherche par slug, création si nécessaire
3. Créer la chanson (sans `artist_id`)
4. Insérer les lignes `song_artists` pour chaque artiste résolu

## Flow d'édition

1. Charger les artistes existants via `song_artists(artists(id, name))`
2. Afficher dans le multi-autocomplete
3. L'utilisateur peut ajouter/retirer des artistes
4. À la soumission : diff entre l'état initial et final
   - Nouveaux artistes → INSERT dans `song_artists`
   - Artistes retirés → DELETE de `song_artists`
   - Artistes inchangés → rien
