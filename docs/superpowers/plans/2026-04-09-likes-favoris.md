# Likes & Favoris — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un système de likes publics (compteur visible + tri) et de favoris privés (collection personnelle) sur les chansons.

**Architecture:** Deux tables Supabase (`likes`, `favorites`) avec RLS. Colonne dénormalisée `likes_count` sur `songs` maintenue par trigger Postgres. Composants client `LikeButton` et `FavoriteButton` avec optimistic updates. Page dédiée `/favoris`.

**Tech Stack:** Supabase (Postgres + RLS), Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Lucide icons

---

## File Structure

| Action | Path | Responsabilité |
|--------|------|---------------|
| Create | `supabase/migrations/010_likes_favorites.sql` | Tables, trigger, RLS, index |
| Modify | `src/types/database.ts` | Ajouter interface `Like`, ajouter `likes_count` à `Song` |
| Create | `src/components/LikeButton.tsx` | Bouton coeur + compteur, optimistic update |
| Create | `src/components/FavoriteButton.tsx` | Bouton bookmark, optimistic update |
| Modify | `src/components/SongCard.tsx` | Intégrer `LikeButton` |
| Modify | `src/app/chansons/[slug]/page.tsx` | Fetch likes/favorites state, passer en props |
| Modify | `src/app/chansons/[slug]/SongDetailClient.tsx` | Intégrer `LikeButton` + `FavoriteButton` |
| Modify | `src/app/chansons/page.tsx` | Fetch user likes, passer aux SongCard, ajouter tri "popular" |
| Modify | `src/app/artistes/[slug]/page.tsx` | Fetch user likes, passer aux SongCard |
| Create | `src/app/favoris/page.tsx` | Page "Mes favoris" protégée |
| Modify | `src/components/UserMenu.tsx` | Lien "Mes favoris" |
| Modify | `src/components/MobileMenu.tsx` | Lien "Mes favoris" |

---

### Task 1: Migration Supabase — tables, trigger, RLS

**Files:**
- Create: `supabase/migrations/010_likes_favorites.sql`

- [ ] **Step 1: Créer le fichier de migration**

```sql
-- supabase/migrations/010_likes_favorites.sql

-- Likes (signal social public)
create table likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  song_id uuid references songs(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(user_id, song_id)
);

-- Favorites (collection privée)
create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  song_id uuid references songs(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(user_id, song_id)
);

-- Colonne dénormalisée sur songs
alter table songs add column likes_count integer default 0 not null;

-- Indexes
create index idx_likes_user on likes(user_id);
create index idx_likes_song on likes(song_id);
create index idx_favorites_user on favorites(user_id);
create index idx_favorites_song on favorites(song_id);
create index idx_songs_likes_count on songs(likes_count desc);

-- Trigger: maintenir likes_count
create or replace function update_likes_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update songs set likes_count = likes_count + 1 where id = NEW.song_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update songs set likes_count = likes_count - 1 where id = OLD.song_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_like_changed
  after insert or delete on likes
  for each row execute function update_likes_count();

-- RLS: likes
alter table likes enable row level security;

create policy "Likes are viewable by everyone"
  on likes for select using (true);
create policy "Authenticated users can insert own likes"
  on likes for insert with check (auth.uid() = user_id);
create policy "Users can delete own likes"
  on likes for delete using (auth.uid() = user_id);

-- RLS: favorites
alter table favorites enable row level security;

create policy "Users can view own favorites"
  on favorites for select using (auth.uid() = user_id);
create policy "Users can insert own favorites"
  on favorites for insert with check (auth.uid() = user_id);
create policy "Users can delete own favorites"
  on favorites for delete using (auth.uid() = user_id);
```

- [ ] **Step 2: Appliquer la migration en local**

Run: `npx supabase db push` (ou via le dashboard Supabase)
Expected: migration appliquée sans erreur

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/010_likes_favorites.sql
git commit -m "feat: migration likes & favorites (tables, trigger, RLS)"
```

---

### Task 2: Types TypeScript

**Files:**
- Modify: `src/types/database.ts:29-42` (interface Song)
- Modify: `src/types/database.ts:86-98` (interfaces ChordVote, Favorite)

- [ ] **Step 1: Ajouter `likes_count` à l'interface `Song`**

Dans `src/types/database.ts`, ajouter `likes_count` après `created_at` dans l'interface `Song` (ligne 41) :

```typescript
export interface Song {
  id: string
  title: string
  slug: string
  artist_id: string
  style: Style
  language: string | null
  original_key: string | null
  bpm: number | null
  youtube_url: string | null
  created_by: string
  status: SongStatus
  created_at: string
  likes_count: number
}
```

- [ ] **Step 2: Ajouter l'interface `Like`**

Ajouter après l'interface `Favorite` existante (ligne 98) :

```typescript
export interface Like {
  id: string
  user_id: string
  song_id: string
  created_at: string
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: types Like + likes_count sur Song"
```

---

### Task 3: Composant `LikeButton`

**Files:**
- Create: `src/components/LikeButton.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface LikeButtonProps {
  songId: string
  initialLikesCount: number
  initialIsLiked: boolean
  size?: 'sm' | 'default'
}

export function LikeButton({ songId, initialLikesCount, initialIsLiked, size = 'default' }: LikeButtonProps) {
  const router = useRouter()
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likesCount, setLikesCount] = useState(initialLikesCount)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/connexion')
      return
    }

    // Optimistic update
    const wasLiked = isLiked
    const prevCount = likesCount
    setIsLiked(!wasLiked)
    setLikesCount(wasLiked ? prevCount - 1 : prevCount + 1)
    setLoading(true)

    if (wasLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('song_id', songId)

      if (error) {
        setIsLiked(wasLiked)
        setLikesCount(prevCount)
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: user.id, song_id: songId })

      if (error) {
        setIsLiked(wasLiked)
        setLikesCount(prevCount)
      }
    }

    setLoading(false)
  }

  const isCompact = size === 'sm'

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggle() }}
      disabled={loading}
      className={`gap-1 ${isCompact ? 'h-7 px-1.5' : 'h-8 px-2'}`}
      title={isLiked ? 'Retirer le like' : 'Liker ce chant'}
    >
      <Heart
        className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} transition-colors ${
          isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
        }`}
      />
      <span className={`${isCompact ? 'text-xs' : 'text-sm'} tabular-nums text-muted-foreground`}>
        {likesCount}
      </span>
    </Button>
  )
}
```

- [ ] **Step 2: Vérifier que le composant compile**

Run: `npx tsc --noEmit`
Expected: pas d'erreur de type

- [ ] **Step 3: Commit**

```bash
git add src/components/LikeButton.tsx
git commit -m "feat: composant LikeButton avec optimistic update"
```

---

### Task 4: Composant `FavoriteButton`

**Files:**
- Create: `src/components/FavoriteButton.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface FavoriteButtonProps {
  songId: string
  initialIsFavorited: boolean
}

export function FavoriteButton({ songId, initialIsFavorited }: FavoriteButtonProps) {
  const router = useRouter()
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/connexion')
      return
    }

    // Optimistic update
    const wasFavorited = isFavorited
    setIsFavorited(!wasFavorited)
    setLoading(true)

    if (wasFavorited) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('song_id', songId)

      if (error) {
        setIsFavorited(wasFavorited)
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, song_id: songId })

      if (error) {
        setIsFavorited(wasFavorited)
      }
    }

    setLoading(false)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      title={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Bookmark
        className={`w-4 h-4 mr-1 transition-colors ${
          isFavorited ? 'fill-primary text-primary' : ''
        }`}
      />
      {isFavorited ? 'Sauvegardé' : 'Sauvegarder'}
    </Button>
  )
}
```

- [ ] **Step 2: Vérifier que le composant compile**

Run: `npx tsc --noEmit`
Expected: pas d'erreur de type

- [ ] **Step 3: Commit**

```bash
git add src/components/FavoriteButton.tsx
git commit -m "feat: composant FavoriteButton avec optimistic update"
```

---

### Task 5: Intégrer `LikeButton` dans `SongCard`

**Files:**
- Modify: `src/components/SongCard.tsx`

- [ ] **Step 1: Ajouter les props et le composant**

Remplacer le contenu complet de `src/components/SongCard.tsx` :

```tsx
import Link from "next/link";
import { Guitar } from "lucide-react";
import { StyleBadge } from "./StyleBadge";
import { Card, CardContent } from "@/components/ui/card";
import { AddToPlaylistButton } from "@/components/AddToPlaylistButton";
import { LikeButton } from "@/components/LikeButton";
import type { Style } from "@/types/database";

interface SongCardProps {
  songId: string;
  title: string;
  slug: string;
  artistName: string;
  style: Style;
  originalKey: string | null;
  likesCount?: number;
  isLiked?: boolean;
}

export function SongCard({ songId, title, slug, artistName, style, originalKey, likesCount = 0, isLiked = false }: SongCardProps) {
  return (
    <Card className="hover:border-primary/30 hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        <Link href={`/chansons/${slug}`} className="block">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-heading text-lg truncate">{title}</h3>
              <p className="text-sm text-muted-foreground">{artistName}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {originalKey && <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{originalKey}</span>}
              <Guitar className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <StyleBadge style={style} />
          <div className="flex items-center gap-1">
            <LikeButton songId={songId} initialLikesCount={likesCount} initialIsLiked={isLiked} size="sm" />
            <AddToPlaylistButton songId={songId} songTitle={title} variant="icon" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: des erreurs sur les pages qui utilisent SongCard (props manquantes) — c'est normal, on les corrige dans les tasks suivantes

- [ ] **Step 3: Commit**

```bash
git add src/components/SongCard.tsx
git commit -m "feat: intégrer LikeButton dans SongCard"
```

---

### Task 6: Intégrer likes/favoris dans la page détail chanson

**Files:**
- Modify: `src/app/chansons/[slug]/page.tsx:46-148`
- Modify: `src/app/chansons/[slug]/SongDetailClient.tsx:1-170`

- [ ] **Step 1: Modifier le server component pour fetch l'état like/favori**

Dans `src/app/chansons/[slug]/page.tsx`, après la ligne `const { data: { user } } = await supabase.auth.getUser()` (ligne 50), ajouter la logique de fetch. Remplacer le bloc de la ligne 50 jusqu'à la fin du `SongDetailClient` (ligne 148) :

```tsx
  const { data: { user } } = await supabase.auth.getUser()

  const { data: song } = await supabase
    .from('songs')
    .select(
      'id, title, slug, style, original_key, bpm, youtube_url, likes_count, artists(name, slug), chord_sheets(id, instrument, tuning, capo, content, contributed_by, votes_up, votes_down, is_official, created_at, updated_at, last_edited_by, profiles:contributed_by(username), editor:last_edited_by(username))'
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!song) {
    notFound()
  }

  // Fetch like/favorite state for current user
  let isLiked = false
  let isFavorited = false
  if (user) {
    const [likeResult, favResult] = await Promise.all([
      supabase.from('likes').select('id').eq('user_id', user.id).eq('song_id', song.id).single(),
      supabase.from('favorites').select('id').eq('user_id', user.id).eq('song_id', song.id).single(),
    ])
    isLiked = !!likeResult.data
    isFavorited = !!favResult.data
  }
```

La query `select` a été modifiée pour inclure `likes_count`.

Puis modifier les props passées à `SongDetailClient` (vers la ligne 140-148) :

```tsx
      <SongDetailClient
        sheets={typedSheets}
        originalKey={song.original_key}
        currentUserId={user?.id ?? null}
        songId={song.id}
        songTitle={song.title}
        artistName={artist?.name ?? ''}
        songSlug={song.slug}
        likesCount={song.likes_count ?? 0}
        isLiked={isLiked}
        isFavorited={isFavorited}
      />
```

- [ ] **Step 2: Modifier `SongDetailClient` pour afficher les boutons**

Dans `src/app/chansons/[slug]/SongDetailClient.tsx` :

Ajouter les imports (après la ligne 7) :

```tsx
import { LikeButton } from '@/components/LikeButton'
import { FavoriteButton } from '@/components/FavoriteButton'
```

Ajouter les props à l'interface `SongDetailClientProps` (après `songSlug: string`, ligne 46) :

```tsx
interface SongDetailClientProps {
  sheets: SheetWithProfile[]
  originalKey: string | null
  currentUserId: string | null
  songId: string
  songTitle: string
  artistName: string
  songSlug: string
  likesCount: number
  isLiked: boolean
  isFavorited: boolean
}
```

Mettre à jour la destructuration de props (ligne 49) :

```tsx
export function SongDetailClient({ sheets, originalKey, currentUserId, songId, songTitle, artistName, songSlug, likesCount, isLiked, isFavorited }: SongDetailClientProps) {
```

Ajouter `LikeButton` et `FavoriteButton` dans la zone d'actions (après `AddToPlaylistButton`, ligne 133). Le bloc actions complet (lignes 128-142) devient :

```tsx
      {/* Actions */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setReaderOpen(true)}>
          <Maximize2 className="w-4 h-4 mr-1" />
          Mode lecteur
        </Button>
        <LikeButton songId={songId} initialLikesCount={likesCount} initialIsLiked={isLiked} />
        <FavoriteButton songId={songId} initialIsFavorited={isFavorited} />
        <AddToPlaylistButton songId={songId} songTitle={songTitle} />
        {currentUserId && (
          <Link href={`/chansons/${songSlug}/contribuer`}>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Ajouter une grille
            </Button>
          </Link>
        )}
      </div>
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: pas d'erreur

- [ ] **Step 4: Commit**

```bash
git add src/app/chansons/\[slug\]/page.tsx src/app/chansons/\[slug\]/SongDetailClient.tsx
git commit -m "feat: likes & favoris sur la page détail chanson"
```

---

### Task 7: Catalogue — fetch likes + tri "popular"

**Files:**
- Modify: `src/app/chansons/page.tsx`

- [ ] **Step 1: Modifier la page catalogue**

Remplacer le contenu complet de `src/app/chansons/page.tsx` :

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SongCard } from "@/components/SongCard";
import { SearchBar } from "@/components/SearchBar";
import type { Style } from "@/types/database";

export const metadata: Metadata = {
  title: "Chansons — Fenua Chords",
};

const STYLES: { value: Style | "tous"; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "bringue", label: "Bringue" },
  { value: "himene", label: "Himene" },
  { value: "variete", label: "Variete" },
  { value: "traditionnel", label: "Traditionnel" },
  { value: "autre", label: "Autre" },
];

const SORTS: { value: string; label: string }[] = [
  { value: "title", label: "A — Z" },
  { value: "popular", label: "Les plus aimés" },
  { value: "recent", label: "Récents" },
];

interface Props {
  searchParams: Promise<{ q?: string; style?: string; sort?: string }>;
}

export default async function ChansonPage({ searchParams }: Props) {
  const { q, style, sort } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from("songs")
    .select("id, title, slug, style, original_key, likes_count, artists(name)")
    .eq("status", "published");

  if (q) {
    query = query.or(`title.ilike.%${q}%,artists.name.ilike.%${q}%`);
  }

  if (style && style !== "tous") {
    query = query.eq("style", style);
  }

  // Tri
  if (sort === "popular") {
    query = query.order("likes_count", { ascending: false }).order("title");
  } else if (sort === "recent") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("title");
  }

  const { data: songs } = await query;

  // Fetch user's liked song IDs
  let likedSongIds: Set<string> = new Set();
  if (user) {
    const { data: likes } = await supabase
      .from("likes")
      .select("song_id")
      .eq("user_id", user.id);
    likedSongIds = new Set((likes ?? []).map((l) => l.song_id));
  }

  const activeStyle = style ?? "tous";
  const activeSort = sort ?? "title";

  function buildFilterLink(styleValue: string, sortValue?: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (styleValue !== "tous") params.set("style", styleValue);
    const s = sortValue ?? activeSort;
    if (s !== "title") params.set("sort", s);
    const qs = params.toString();
    return `/chansons${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-heading text-3xl text-foreground mb-6">Chansons</h1>

      <Suspense>
        <SearchBar />
      </Suspense>

      {/* Style filters */}
      <div className="flex flex-wrap gap-2 mt-6 mb-4">
        {STYLES.map(({ value, label }) => (
          <Link
            key={value}
            href={buildFilterLink(value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              activeStyle === value
                ? "bg-primary text-white border-primary"
                : "bg-card text-muted-foreground border-primary/20 hover:border-primary/40"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Sort options */}
      <div className="flex flex-wrap gap-2 mb-8">
        {SORTS.map(({ value, label }) => (
          <Link
            key={value}
            href={buildFilterLink(activeStyle, value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              activeSort === value
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border hover:border-foreground/30"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {!songs || songs.length === 0 ? (
        <p className="text-muted-foreground">Aucune chanson trouvée.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {songs.map((song) => {
            const artistName = Array.isArray(song.artists)
              ? (song.artists[0] as { name: string })?.name ?? ""
              : (song.artists as { name: string } | null)?.name ?? "";
            return (
              <SongCard
                key={song.id}
                songId={song.id}
                title={song.title}
                slug={song.slug}
                artistName={artistName}
                style={song.style as Style}
                originalKey={song.original_key}
                likesCount={song.likes_count ?? 0}
                isLiked={likedSongIds.has(song.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: pas d'erreur

- [ ] **Step 3: Commit**

```bash
git add src/app/chansons/page.tsx
git commit -m "feat: catalogue — likes sur SongCard + tri par popularité"
```

---

### Task 8: Page artiste — passer likes aux SongCard

**Files:**
- Modify: `src/app/artistes/[slug]/page.tsx`

- [ ] **Step 1: Ajouter le fetch des likes et passer les props**

Dans `src/app/artistes/[slug]/page.tsx`, après le fetch des songs (ligne 52), ajouter le fetch de l'utilisateur et de ses likes :

```tsx
  const { data: { user } } = await supabase.auth.getUser()

  let likedSongIds: Set<string> = new Set()
  if (user) {
    const { data: likes } = await supabase
      .from('likes')
      .select('song_id')
      .eq('user_id', user.id)
    likedSongIds = new Set((likes ?? []).map((l) => l.song_id))
  }
```

Modifier la query des songs pour inclure `likes_count` (ligne 49) :

```tsx
  const { data: songs } = await supabase
    .from("songs")
    .select("id, title, slug, style, original_key, likes_count")
    .eq("artist_id", artist.id)
    .eq("status", "published")
    .order("title");
```

Modifier le rendu des SongCard (lignes 95-103) pour passer les nouvelles props :

```tsx
            <SongCard
              key={song.id}
              songId={song.id}
              title={song.title}
              slug={song.slug}
              artistName={artist.name}
              style={song.style as Style}
              originalKey={song.original_key}
              likesCount={song.likes_count ?? 0}
              isLiked={likedSongIds.has(song.id)}
            />
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: pas d'erreur

- [ ] **Step 3: Commit**

```bash
git add src/app/artistes/\[slug\]/page.tsx
git commit -m "feat: page artiste — likes sur SongCard"
```

---

### Task 9: Page "Mes favoris"

**Files:**
- Create: `src/app/favoris/page.tsx`

- [ ] **Step 1: Créer la page**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Bookmark } from 'lucide-react'
import { requireAuth } from '@/lib/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { SongCard } from '@/components/SongCard'
import type { Style } from '@/types/database'

export const metadata: Metadata = {
  title: 'Mes favoris — Fenua Chords',
}

export default async function FavorisPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: favorites } = await supabase
    .from('favorites')
    .select('song_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const songIds = (favorites ?? []).map((f) => f.song_id)

  // Fetch liked song IDs for this user
  const { data: likes } = await supabase
    .from('likes')
    .select('song_id')
    .eq('user_id', user.id)
  const likedSongIds = new Set((likes ?? []).map((l) => l.song_id))

  let songs: { id: string; title: string; slug: string; style: string; original_key: string | null; likes_count: number; artists: { name: string } | null }[] = []

  if (songIds.length > 0) {
    const { data } = await supabase
      .from('songs')
      .select('id, title, slug, style, original_key, likes_count, artists(name)')
      .in('id', songIds)
      .eq('status', 'published')

    // Maintenir l'ordre par date d'ajout aux favoris
    const songMap = new Map((data ?? []).map((s) => [s.id, s]))
    songs = songIds
      .map((id) => songMap.get(id))
      .filter((s): s is NonNullable<typeof s> => s != null)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-2 mb-8">
        <Bookmark className="w-6 h-6 text-primary" />
        <h1 className="font-heading text-3xl text-foreground">Mes favoris</h1>
        <span className="text-muted-foreground text-sm ml-2">({songs.length})</span>
      </div>

      {songs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Tu n&apos;as pas encore de chants en favoris.</p>
          <Link
            href="/chansons"
            className="text-primary hover:underline font-medium"
          >
            Explorer le catalogue
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {songs.map((song) => {
            const artistName = (song.artists as { name: string } | null)?.name ?? ''
            return (
              <SongCard
                key={song.id}
                songId={song.id}
                title={song.title}
                slug={song.slug}
                artistName={artistName}
                style={song.style as Style}
                originalKey={song.original_key}
                likesCount={song.likes_count ?? 0}
                isLiked={likedSongIds.has(song.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: pas d'erreur

- [ ] **Step 3: Commit**

```bash
git add src/app/favoris/page.tsx
git commit -m "feat: page Mes favoris"
```

---

### Task 10: Navigation — liens "Mes favoris"

**Files:**
- Modify: `src/components/UserMenu.tsx:5,60-67`
- Modify: `src/components/MobileMenu.tsx:48-54`

- [ ] **Step 1: Modifier `UserMenu`**

Dans `src/components/UserMenu.tsx`, ajouter `Bookmark` à l'import des icônes (ligne 5) :

```tsx
import { User, LogOut, Settings, FileText, Shield, ListMusic, Bookmark } from "lucide-react";
```

Après le lien "Mes contributions" (après la ligne 67, avant "Ma playlist"), ajouter :

```tsx
            <Link
              href="/favoris"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Bookmark className="w-4 h-4 text-muted-foreground" />
              Mes favoris
            </Link>
```

- [ ] **Step 2: Modifier `MobileMenu`**

Dans `src/components/MobileMenu.tsx`, après le lien "Mes contributions" (après la ligne 54, avant "Ma playlist"), ajouter :

```tsx
            <Link
              href="/favoris"
              onClick={onClose}
              className={buttonVariants({ variant: "ghost", className: "w-full justify-start" })}
            >
              Mes favoris
            </Link>
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: pas d'erreur

- [ ] **Step 4: Vérifier le build complet**

Run: `npm run build`
Expected: build réussi sans erreur

- [ ] **Step 5: Commit**

```bash
git add src/components/UserMenu.tsx src/components/MobileMenu.tsx
git commit -m "feat: liens Mes favoris dans UserMenu et MobileMenu"
```

---

## Résumé des tasks

| # | Effort | Description | Fichiers |
|---|--------|-------------|----------|
| 1 | XS | Migration Supabase | `010_likes_favorites.sql` |
| 2 | XS | Types TypeScript | `database.ts` |
| 3 | S | Composant LikeButton | `LikeButton.tsx` |
| 4 | S | Composant FavoriteButton | `FavoriteButton.tsx` |
| 5 | XS | LikeButton dans SongCard | `SongCard.tsx` |
| 6 | S | Likes/favoris page détail | `page.tsx`, `SongDetailClient.tsx` |
| 7 | M | Catalogue + tri popular | `chansons/page.tsx` |
| 8 | XS | Page artiste + likes | `artistes/[slug]/page.tsx` |
| 9 | S | Page Mes favoris | `favoris/page.tsx` |
| 10 | XS | Navigation UserMenu + MobileMenu | `UserMenu.tsx`, `MobileMenu.tsx` |
