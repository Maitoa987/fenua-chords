# Playlists — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre aux utilisateurs de créer une playlist (1 max), organiser les chants par drag & drop, naviguer en mode lecture plein écran avec auto-scroll, et partager via QR code.

**Architecture:** Approche hybride — routes dédiées pour la gestion et la lecture (`/playlists`, `/playlists/[shareToken]`, `/playlists/[shareToken]/lecture`) + mini-barre sticky Spotify en bas de page quand une playlist est active. État partagé via React Context + sessionStorage.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS), React 19, Tailwind v4, shadcn/ui, @dnd-kit (drag & drop), qrcode.react (QR), Wake Lock API, requestAnimationFrame (auto-scroll)

**Spec:** `docs/superpowers/specs/2026-04-08-playlists-design.md`

---

### Task 1: Installer les dépendances

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Installer qrcode.react et @dnd-kit**

```bash
cd "/Users/maitoa/Desktop/Fenua-Chords/Fenua Chords"
npm install qrcode.react @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Vérifier le build**

```bash
npm run build
```

Expected: Build réussi sans erreur.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add qrcode.react and @dnd-kit dependencies for playlists"
```

---

### Task 2: Migration SQL — tables playlists, playlist_songs, playlist_follows + RLS

**Files:**
- Create: `supabase/migrations/007_playlists.sql`

- [ ] **Step 1: Créer la migration**

```sql
-- supabase/migrations/007_playlists.sql

-- Enum for playlist visibility
create type playlist_visibility as enum ('private', 'link', 'public');

-- Playlists table
create table playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) <= 100),
  description text,
  visibility playlist_visibility not null default 'private',
  share_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_playlist_per_user unique (owner_id)
);

-- Playlist songs (ordered)
create table playlist_songs (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references playlists(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  position integer not null,
  added_at timestamptz not null default now(),
  constraint unique_song_per_playlist unique (playlist_id, song_id)
);

-- Playlist follows
create table playlist_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references profiles(id) on delete cascade,
  playlist_id uuid not null references playlists(id) on delete cascade,
  followed_at timestamptz not null default now(),
  constraint unique_follow unique (follower_id, playlist_id)
);

-- Indexes
create index idx_playlist_songs_playlist on playlist_songs(playlist_id);
create index idx_playlist_songs_position on playlist_songs(playlist_id, position);
create index idx_playlist_follows_follower on playlist_follows(follower_id);
create index idx_playlists_share_token on playlists(share_token);

-- Auto-update updated_at
create or replace function update_playlist_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger playlist_updated_at
  before update on playlists
  for each row execute function update_playlist_updated_at();

-- RLS
alter table playlists enable row level security;
alter table playlist_songs enable row level security;
alter table playlist_follows enable row level security;

-- Playlists policies
create policy "Owner can do everything with own playlist"
  on playlists for all using (auth.uid() = owner_id);

create policy "Anyone can view public playlists"
  on playlists for select using (visibility = 'public');

create policy "Anyone can view link-shared playlists"
  on playlists for select using (visibility = 'link');

-- Playlist songs policies
create policy "Owner can manage playlist songs"
  on playlist_songs for all using (
    exists (
      select 1 from playlists
      where playlists.id = playlist_songs.playlist_id
      and playlists.owner_id = auth.uid()
    )
  );

create policy "Anyone can view songs of accessible playlists"
  on playlist_songs for select using (
    exists (
      select 1 from playlists
      where playlists.id = playlist_songs.playlist_id
      and playlists.visibility in ('public', 'link')
    )
  );

-- Playlist follows policies
create policy "Users can manage own follows"
  on playlist_follows for all using (auth.uid() = follower_id);

create policy "Anyone can see follow counts"
  on playlist_follows for select using (true);
```

- [ ] **Step 2: Appliquer la migration sur Supabase**

Exécuter le SQL via le dashboard Supabase (SQL Editor) ou via `supabase db push` si CLI configuré.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/007_playlists.sql
git commit -m "feat: add playlists, playlist_songs, playlist_follows tables with RLS"
```

---

### Task 3: Mettre à jour les types TypeScript + utilitaire share token

**Files:**
- Modify: `src/types/database.ts`
- Create: `src/lib/playlist.ts`

- [ ] **Step 1: Mettre à jour les types dans `src/types/database.ts`**

Remplacer l'interface `Playlist` existante et ajouter `PlaylistFollow` :

```typescript
// Remplacer l'interface Playlist existante (lignes 58-64)
export interface Playlist {
  id: string
  owner_id: string
  title: string
  description: string | null
  visibility: Visibility
  share_token: string
  created_at: string
  updated_at: string
}

// Remplacer l'interface PlaylistSong existante (lignes 66-71)
export interface PlaylistSong {
  id: string
  playlist_id: string
  song_id: string
  position: number
  added_at: string
}

// Ajouter après PlaylistSong
export interface PlaylistFollow {
  id: string
  follower_id: string
  playlist_id: string
  followed_at: string
}
```

- [ ] **Step 2: Créer `src/lib/playlist.ts`**

```typescript
export function generateShareToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}
```

- [ ] **Step 3: Vérifier les types**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/types/database.ts src/lib/playlist.ts
git commit -m "feat: update playlist types and add share token utility"
```

---

### Task 4: PlaylistContext — état partagé pour la playlist active

**Files:**
- Create: `src/lib/playlist-context.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Créer `src/lib/playlist-context.tsx`**

```typescript
'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface PlaylistSongItem {
  id: string
  songId: string
  title: string
  slug: string
  artistName: string
  position: number
}

interface ActivePlaylist {
  id: string
  title: string
  shareToken: string
  songs: PlaylistSongItem[]
  currentIndex: number
}

interface PlaylistContextValue {
  active: ActivePlaylist | null
  activate: (playlist: Omit<ActivePlaylist, 'currentIndex'>, startIndex?: number) => void
  deactivate: () => void
  goToIndex: (index: number) => void
  next: () => void
  prev: () => void
}

const PlaylistContext = createContext<PlaylistContextValue | null>(null)

const STORAGE_KEY = 'fenua-active-playlist'

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActivePlaylist | null>(null)

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) setActive(JSON.parse(stored))
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Persist to sessionStorage on change
  useEffect(() => {
    if (active) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(active))
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [active])

  const activate = useCallback((playlist: Omit<ActivePlaylist, 'currentIndex'>, startIndex = 0) => {
    setActive({ ...playlist, currentIndex: startIndex })
  }, [])

  const deactivate = useCallback(() => {
    setActive(null)
  }, [])

  const goToIndex = useCallback((index: number) => {
    setActive((prev) => {
      if (!prev) return null
      const clamped = Math.max(0, Math.min(index, prev.songs.length - 1))
      return { ...prev, currentIndex: clamped }
    })
  }, [])

  const next = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.currentIndex >= prev.songs.length - 1) return prev
      return { ...prev, currentIndex: prev.currentIndex + 1 }
    })
  }, [])

  const prev = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.currentIndex <= 0) return prev
      return { ...prev, currentIndex: prev.currentIndex - 1 }
    })
  }, [])

  return (
    <PlaylistContext value={{ active, activate, deactivate, goToIndex, next, prev }}>
      {children}
    </PlaylistContext>
  )
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext)
  if (!ctx) throw new Error('usePlaylist must be used within PlaylistProvider')
  return ctx
}
```

- [ ] **Step 2: Intégrer le provider dans `src/app/layout.tsx`**

Ajouter l'import en haut du fichier :

```typescript
import { PlaylistProvider } from "@/lib/playlist-context";
```

Wrapper le contenu du `<body>` :

```tsx
<body className="min-h-full flex flex-col">
  <PlaylistProvider>
    <Header />
    <main className="flex-1">{children}</main>
    <Footer />
  </PlaylistProvider>
</body>
```

- [ ] **Step 3: Vérifier le build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/playlist-context.tsx src/app/layout.tsx
git commit -m "feat: add PlaylistContext provider for active playlist state"
```

---

### Task 5: Page `/playlists` — création et gestion de playlist

**Files:**
- Create: `src/app/playlists/page.tsx`
- Create: `src/app/playlists/PlaylistManagerClient.tsx`

- [ ] **Step 1: Créer la page serveur `src/app/playlists/page.tsx`**

```typescript
import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { PlaylistManagerClient } from './PlaylistManagerClient'

export const metadata: Metadata = {
  title: 'Ma playlist — Fenua Chords',
}

export default async function PlaylistPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Fetch user's playlist with songs
  const { data: playlist } = await supabase
    .from('playlists')
    .select('id, title, description, visibility, share_token, created_at, updated_at')
    .eq('owner_id', user.id)
    .single()

  let songs: {
    id: string
    song_id: string
    position: number
    song: { id: string; title: string; slug: string; style: string; artists: { name: string } | null }
  }[] = []

  if (playlist) {
    const { data } = await supabase
      .from('playlist_songs')
      .select('id, song_id, position, songs(id, title, slug, style, artists(name))')
      .eq('playlist_id', playlist.id)
      .order('position')

    songs = (data ?? []) as typeof songs
  }

  // Fetch followed playlists
  const { data: follows } = await supabase
    .from('playlist_follows')
    .select('id, playlist_id, playlists(id, title, share_token, visibility, profiles:owner_id(username))')
    .eq('follower_id', user.id)

  const followedPlaylists = (follows ?? []).map((f) => {
    const p = f.playlists as unknown as {
      id: string
      title: string
      share_token: string
      visibility: string
      profiles: { username: string } | null
    }
    return {
      followId: f.id,
      playlistId: f.playlist_id,
      title: p?.title ?? '',
      shareToken: p?.share_token ?? '',
      ownerName: p?.profiles?.username ?? 'Inconnu',
    }
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <PlaylistManagerClient
        playlist={playlist}
        songs={songs.map((s) => {
          const song = s.song as unknown as { id: string; title: string; slug: string; style: string; artists: { name: string } | null }
          return {
            id: s.id,
            songId: s.song_id,
            position: s.position,
            title: song.title,
            slug: song.slug,
            style: song.style,
            artistName: Array.isArray(song.artists)
              ? (song.artists[0] as { name: string })?.name ?? ''
              : song.artists?.name ?? '',
          }
        })}
        followedPlaylists={followedPlaylists}
      />
    </div>
  )
}
```

- [ ] **Step 2: Créer le composant client `src/app/playlists/PlaylistManagerClient.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, GripVertical, Play, Share2, ListMusic, Eye } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { StyleBadge } from '@/components/StyleBadge'
import { createClient } from '@/lib/supabase/client'
import { generateShareToken } from '@/lib/playlist'
import { usePlaylist } from '@/lib/playlist-context'
import type { Visibility, Style } from '@/types/database'

interface PlaylistData {
  id: string
  title: string
  description: string | null
  visibility: Visibility
  share_token: string
  created_at: string
  updated_at: string
}

interface SongItem {
  id: string // playlist_songs.id
  songId: string
  position: number
  title: string
  slug: string
  style: string
  artistName: string
}

interface FollowedPlaylist {
  followId: string
  playlistId: string
  title: string
  shareToken: string
  ownerName: string
}

interface Props {
  playlist: PlaylistData | null
  songs: SongItem[]
  followedPlaylists: FollowedPlaylist[]
}

// Sortable song row
function SortableSongRow({
  song,
  onRemove,
}: {
  song: SongItem
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: song.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground touch-none">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <Link href={`/chansons/${song.slug}`} className="font-medium hover:text-primary truncate block">
          {song.title}
        </Link>
        <p className="text-sm text-muted-foreground">{song.artistName}</p>
      </div>
      <StyleBadge style={song.style as Style} />
      <button
        onClick={() => onRemove(song.id)}
        className="text-muted-foreground hover:text-destructive transition-colors p-1"
        aria-label={`Retirer ${song.title}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

export function PlaylistManagerClient({ playlist, songs: initialSongs, followedPlaylists }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(playlist?.title ?? 'Ma playlist')
  const [songs, setSongs] = useState(initialSongs)
  const [isEditing, setIsEditing] = useState(false)
  const { activate } = usePlaylist()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Create playlist
  async function handleCreate() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('playlists').insert({
      owner_id: user.id,
      title: 'Ma playlist',
      share_token: generateShareToken(),
      visibility: 'private' as const,
    })

    if (!error) {
      startTransition(() => router.refresh())
    }
  }

  // Update title
  async function handleUpdateTitle() {
    if (!playlist) return
    const supabase = createClient()
    await supabase.from('playlists').update({ title }).eq('id', playlist.id)
    setIsEditing(false)
    startTransition(() => router.refresh())
  }

  // Remove song
  async function handleRemoveSong(playlistSongId: string) {
    if (!playlist) return
    const supabase = createClient()
    await supabase.from('playlist_songs').delete().eq('id', playlistSongId)
    setSongs((prev) => prev.filter((s) => s.id !== playlistSongId))
  }

  // Drag end — reorder
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !playlist) return

    const oldIndex = songs.findIndex((s) => s.id === active.id)
    const newIndex = songs.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(songs, oldIndex, newIndex)
    setSongs(reordered)

    // Persist new positions
    const supabase = createClient()
    await Promise.all(
      reordered.map((song, index) =>
        supabase
          .from('playlist_songs')
          .update({ position: index })
          .eq('id', song.id)
      )
    )
  }

  // Launch reading mode
  function handleLaunchReader() {
    if (!playlist || songs.length === 0) return
    activate({
      id: playlist.id,
      title: playlist.title,
      shareToken: playlist.share_token,
      songs: songs.map((s) => ({
        id: s.id,
        songId: s.songId,
        title: s.title,
        slug: s.slug,
        artistName: s.artistName,
        position: s.position,
      })),
    })
    router.push(`/playlists/${playlist.share_token}/lecture`)
  }

  // No playlist yet — creation prompt
  if (!playlist) {
    return (
      <div className="text-center py-20">
        <ListMusic className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-heading text-3xl mb-2">Ma playlist</h1>
        <p className="text-muted-foreground mb-6">
          Crée ta playlist pour organiser tes chants préférés.
        </p>
        <Button onClick={handleCreate} disabled={isPending}>
          <Plus className="w-4 h-4 mr-2" />
          Créer ma playlist
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="text-2xl font-heading"
                autoFocus
              />
              <Button size="sm" onClick={handleUpdateTitle}>OK</Button>
              <Button size="sm" variant="ghost" onClick={() => { setTitle(playlist.title); setIsEditing(false) }}>
                Annuler
              </Button>
            </div>
          ) : (
            <div>
              <h1
                className="font-heading text-3xl cursor-pointer hover:text-primary transition-colors"
                onClick={() => setIsEditing(true)}
                title="Cliquer pour modifier"
              >
                {playlist.title}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {songs.length} chant{songs.length > 1 ? 's' : ''} • {playlist.visibility === 'private' ? 'Privée' : playlist.visibility === 'link' ? 'Lien direct' : 'Publique'}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/playlists/${playlist.share_token}`}>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-1" />
              Aperçu
            </Button>
          </Link>
          <Button variant="outline" size="sm" id="share-playlist-trigger">
            <Share2 className="w-4 h-4 mr-1" />
            Partager
          </Button>
          {songs.length > 0 && (
            <Button size="sm" onClick={handleLaunchReader}>
              <Play className="w-4 h-4 mr-1" />
              Lecture
            </Button>
          )}
        </div>
      </div>

      {/* Song list with drag & drop */}
      {songs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Ta playlist est vide. Ajoute des chants depuis le{' '}
              <Link href="/chansons" className="text-primary hover:underline">catalogue</Link>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={songs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {songs.map((song) => (
                <SortableSongRow key={song.id} song={song} onRemove={handleRemoveSong} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Followed playlists */}
      {followedPlaylists.length > 0 && (
        <div className="mt-12">
          <h2 className="font-heading text-xl mb-4">Playlists suivies</h2>
          <div className="space-y-2">
            {followedPlaylists.map((fp) => (
              <Link
                key={fp.followId}
                href={`/playlists/${fp.shareToken}`}
                className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
              >
                <div>
                  <p className="font-medium">{fp.title}</p>
                  <p className="text-sm text-muted-foreground">par {fp.ownerName}</p>
                </div>
                <Play className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quota banner */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
        Envie de plus de playlists ? <span className="font-medium">Bientôt disponible</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Vérifier le build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/playlists/page.tsx src/app/playlists/PlaylistManagerClient.tsx
git commit -m "feat: add playlist management page with drag & drop reordering"
```

---

### Task 6: AddToPlaylistButton — bouton d'ajout réutilisable

**Files:**
- Create: `src/components/AddToPlaylistButton.tsx`

- [ ] **Step 1: Créer `src/components/AddToPlaylistButton.tsx`**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ListPlus, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface AddToPlaylistButtonProps {
  songId: string
  songTitle: string
  variant?: 'default' | 'icon'
}

export function AddToPlaylistButton({ songId, songTitle, variant = 'default' }: AddToPlaylistButtonProps) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'added' | 'already' | 'no-playlist' | 'no-auth'>('idle')

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setState('no-auth')
        return
      }

      const { data: playlist } = await supabase
        .from('playlists')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!playlist) {
        if (!cancelled) setState('no-playlist')
        return
      }

      const { data: existing } = await supabase
        .from('playlist_songs')
        .select('id')
        .eq('playlist_id', playlist.id)
        .eq('song_id', songId)
        .single()

      if (!cancelled) setState(existing ? 'already' : 'idle')
    }

    check()
    return () => { cancelled = true }
  }, [songId])

  async function handleAdd() {
    setState('loading')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: playlist } = await supabase
      .from('playlists')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!playlist) {
      setState('no-playlist')
      return
    }

    // Get max position
    const { data: maxPos } = await supabase
      .from('playlist_songs')
      .select('position')
      .eq('playlist_id', playlist.id)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (maxPos?.position ?? -1) + 1

    const { error } = await supabase.from('playlist_songs').insert({
      playlist_id: playlist.id,
      song_id: songId,
      position: nextPosition,
    })

    if (!error) {
      setState('added')
    }
  }

  if (state === 'no-auth') {
    return variant === 'icon' ? null : (
      <Button variant="outline" size="sm" onClick={() => router.push('/connexion')} title="Connecte-toi pour ajouter à ta playlist">
        <ListPlus className="w-4 h-4 mr-1" />
        Playlist
      </Button>
    )
  }

  if (state === 'no-playlist') {
    return (
      <Button variant="outline" size="sm" onClick={() => router.push('/playlists')} title="Crée ta playlist d'abord">
        <ListPlus className="w-4 h-4 mr-1" />
        {variant === 'icon' ? null : 'Créer ma playlist'}
      </Button>
    )
  }

  if (state === 'already' || state === 'added') {
    return (
      <Button variant="outline" size="sm" disabled className="opacity-60">
        <Check className="w-4 h-4 mr-1" />
        {variant === 'icon' ? null : 'Ajouté'}
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAdd}
      disabled={state === 'loading'}
      title={`Ajouter "${songTitle}" à ma playlist`}
    >
      {state === 'loading' ? (
        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
      ) : (
        <ListPlus className="w-4 h-4 mr-1" />
      )}
      {variant === 'icon' ? null : 'Playlist'}
    </Button>
  )
}
```

- [ ] **Step 2: Vérifier le build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/AddToPlaylistButton.tsx
git commit -m "feat: add AddToPlaylistButton component"
```

---

### Task 7: Intégrer AddToPlaylistButton dans les pages existantes

**Files:**
- Modify: `src/app/chansons/[slug]/SongDetailClient.tsx`
- Modify: `src/components/SongCard.tsx`

- [ ] **Step 1: Ajouter le bouton dans `SongDetailClient.tsx`**

Ajouter l'import en haut :

```typescript
import { AddToPlaylistButton } from '@/components/AddToPlaylistButton'
```

Ajouter le bouton dans la section metadata, après le lien "Modifier" (vers la fin du bloc `<div className="flex flex-wrap gap-x-6 ...">`) :

Après la fermeture du `</div>` des métadonnées (ligne ~96 du fichier original) et avant le bloc Transpose controls, ajouter :

```tsx
{/* Add to playlist */}
<div className="mb-4">
  <AddToPlaylistButton songId={sheets[activeIndex]?.id ? activeSheet.id.split('_')[0] : ''} songTitle="" />
</div>
```

En réalité, le composant a besoin du `song_id`, pas du `sheet_id`. Il faut passer le `songId` en prop. Modifier l'interface `SongDetailClientProps` pour inclure `songId` et `songTitle` :

Dans `SongDetailClient.tsx`, ajouter les props :

```typescript
interface SongDetailClientProps {
  sheets: SheetWithProfile[]
  originalKey: string | null
  currentUserId: string | null
  songId: string
  songTitle: string
}
```

Mettre à jour la destructuration :

```typescript
export function SongDetailClient({ sheets, originalKey, currentUserId, songId, songTitle }: SongDetailClientProps) {
```

Ajouter le bouton juste avant le bloc `{/* Transpose controls */}` :

```tsx
{/* Add to playlist */}
<div className="mb-4">
  <AddToPlaylistButton songId={songId} songTitle={songTitle} />
</div>
```

Dans `src/app/chansons/[slug]/page.tsx`, passer les nouvelles props à `SongDetailClient` :

```tsx
<SongDetailClient
  sheets={typedSheets}
  originalKey={song.original_key}
  currentUserId={user?.id ?? null}
  songId={song.id}
  songTitle={song.title}
/>
```

- [ ] **Step 2: Ajouter le bouton sur `SongCard.tsx`**

Modifier `SongCard` pour accepter un `songId` et afficher le bouton. Le SongCard est un composant serveur wrappé dans un `<Link>`, donc on ne peut pas y ajouter un bouton client directement sans casser la navigation. Solution : ajouter le `songId` en prop et rendre le bouton en dehors du `<Link>`.

Remplacer le contenu de `src/components/SongCard.tsx` :

```typescript
import Link from "next/link";
import { Guitar } from "lucide-react";
import { StyleBadge } from "./StyleBadge";
import { Card, CardContent } from "@/components/ui/card";
import { AddToPlaylistButton } from "@/components/AddToPlaylistButton";
import type { Style } from "@/types/database";

interface SongCardProps {
  songId: string;
  title: string;
  slug: string;
  artistName: string;
  style: Style;
  originalKey: string | null;
}

export function SongCard({ songId, title, slug, artistName, style, originalKey }: SongCardProps) {
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
          <AddToPlaylistButton songId={songId} songTitle={title} variant="icon" />
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Mettre à jour l'appel SongCard dans `src/app/chansons/page.tsx`**

Passer `songId` en prop :

```tsx
<SongCard
  key={song.id}
  songId={song.id}
  title={song.title}
  slug={song.slug}
  artistName={artistName}
  style={song.style as Style}
  originalKey={song.original_key}
/>
```

- [ ] **Step 4: Vérifier que SongCard est utilisé ailleurs et mettre à jour**

Rechercher tous les usages de `<SongCard` dans le codebase et ajouter la prop `songId` partout.

```bash
grep -rn "SongCard" src/ --include="*.tsx"
```

Mettre à jour chaque occurrence trouvée.

- [ ] **Step 5: Vérifier le build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/app/chansons/\[slug\]/SongDetailClient.tsx src/app/chansons/\[slug\]/page.tsx src/components/SongCard.tsx src/app/chansons/page.tsx
git commit -m "feat: integrate AddToPlaylistButton on song detail and catalogue pages"
```

---

### Task 8: Vue publique playlist `/playlists/[shareToken]`

**Files:**
- Create: `src/app/playlists/[shareToken]/page.tsx`
- Create: `src/app/playlists/[shareToken]/PlaylistPublicClient.tsx`

- [ ] **Step 1: Créer la page serveur `src/app/playlists/[shareToken]/page.tsx`**

```typescript
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlaylistPublicClient } from './PlaylistPublicClient'

export const revalidate = 60

interface Props {
  params: Promise<{ shareToken: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareToken } = await params
  const supabase = await createClient()

  const { data: playlist } = await supabase
    .from('playlists')
    .select('title, profiles:owner_id(username)')
    .eq('share_token', shareToken)
    .single()

  if (!playlist) return { title: 'Playlist introuvable — Fenua Chords' }

  const owner = playlist.profiles as unknown as { username: string } | null
  const title = `${playlist.title}${owner ? ` par ${owner.username}` : ''} — Fenua Chords`

  return {
    title,
    description: `Playlist "${playlist.title}" sur Fenua Chords.`,
    openGraph: { title, type: 'website' },
  }
}

export default async function PlaylistPublicPage({ params }: Props) {
  const { shareToken } = await params
  const supabase = await createClient()

  const { data: playlist } = await supabase
    .from('playlists')
    .select('id, title, description, visibility, share_token, owner_id, profiles:owner_id(username)')
    .eq('share_token', shareToken)
    .single()

  if (!playlist || playlist.visibility === 'private') {
    notFound()
  }

  const { data: songs } = await supabase
    .from('playlist_songs')
    .select('id, song_id, position, songs(id, title, slug, style, artists(name))')
    .eq('playlist_id', playlist.id)
    .order('position')

  const { data: { user } } = await supabase.auth.getUser()

  // Check if current user follows this playlist
  let isFollowing = false
  if (user) {
    const { data: follow } = await supabase
      .from('playlist_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('playlist_id', playlist.id)
      .single()
    isFollowing = !!follow
  }

  const owner = playlist.profiles as unknown as { username: string } | null
  const isOwner = user?.id === playlist.owner_id

  const songItems = (songs ?? []).map((s) => {
    const song = s.songs as unknown as { id: string; title: string; slug: string; style: string; artists: { name: string } | null }
    return {
      id: s.id,
      songId: s.song_id,
      position: s.position,
      title: song.title,
      slug: song.slug,
      style: song.style,
      artistName: Array.isArray(song.artists)
        ? (song.artists[0] as { name: string })?.name ?? ''
        : song.artists?.name ?? '',
    }
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <PlaylistPublicClient
        playlist={{
          id: playlist.id,
          title: playlist.title,
          description: playlist.description,
          visibility: playlist.visibility,
          shareToken: playlist.share_token,
          ownerName: owner?.username ?? 'Inconnu',
        }}
        songs={songItems}
        currentUserId={user?.id ?? null}
        isOwner={isOwner}
        isFollowing={isFollowing}
      />
    </div>
  )
}
```

- [ ] **Step 2: Créer `src/app/playlists/[shareToken]/PlaylistPublicClient.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Play, Copy, Heart, HeartOff, ListMusic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StyleBadge } from '@/components/StyleBadge'
import { createClient } from '@/lib/supabase/client'
import { generateShareToken } from '@/lib/playlist'
import { usePlaylist } from '@/lib/playlist-context'
import type { Style, Visibility } from '@/types/database'

interface PlaylistInfo {
  id: string
  title: string
  description: string | null
  visibility: Visibility
  shareToken: string
  ownerName: string
}

interface SongItem {
  id: string
  songId: string
  position: number
  title: string
  slug: string
  style: string
  artistName: string
}

interface Props {
  playlist: PlaylistInfo
  songs: SongItem[]
  currentUserId: string | null
  isOwner: boolean
  isFollowing: boolean
}

export function PlaylistPublicClient({ playlist, songs, currentUserId, isOwner, isFollowing: initialFollowing }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [following, setFollowing] = useState(initialFollowing)
  const { activate } = usePlaylist()

  async function handleFollow() {
    if (!currentUserId) {
      router.push('/connexion')
      return
    }
    const supabase = createClient()
    if (following) {
      await supabase
        .from('playlist_follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('playlist_id', playlist.id)
      setFollowing(false)
    } else {
      await supabase.from('playlist_follows').insert({
        follower_id: currentUserId,
        playlist_id: playlist.id,
      })
      setFollowing(true)
    }
  }

  async function handleCopy() {
    if (!currentUserId) {
      router.push('/connexion')
      return
    }
    const supabase = createClient()

    // Check if user already has a playlist
    const { data: existing } = await supabase
      .from('playlists')
      .select('id')
      .eq('owner_id', currentUserId)
      .single()

    if (existing) {
      alert('Tu as déjà une playlist. Bientôt disponible : playlists illimitées !')
      return
    }

    // Create playlist with copied songs
    const { data: newPlaylist, error } = await supabase
      .from('playlists')
      .insert({
        owner_id: currentUserId,
        title: playlist.title,
        share_token: generateShareToken(),
        visibility: 'private' as const,
      })
      .select('id')
      .single()

    if (error || !newPlaylist) return

    // Copy songs
    if (songs.length > 0) {
      await supabase.from('playlist_songs').insert(
        songs.map((s, i) => ({
          playlist_id: newPlaylist.id,
          song_id: s.songId,
          position: i,
        }))
      )
    }

    startTransition(() => router.push('/playlists'))
  }

  function handleLaunchReader() {
    activate({
      id: playlist.id,
      title: playlist.title,
      shareToken: playlist.shareToken,
      songs: songs.map((s) => ({
        id: s.id,
        songId: s.songId,
        title: s.title,
        slug: s.slug,
        artistName: s.artistName,
        position: s.position,
      })),
    })
    router.push(`/playlists/${playlist.shareToken}/lecture`)
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <ListMusic className="w-10 h-10 text-primary mx-auto mb-3" />
        <h1 className="font-heading text-3xl">{playlist.title}</h1>
        <p className="text-muted-foreground mt-1">
          par {playlist.ownerName} • {songs.length} chant{songs.length > 1 ? 's' : ''}
        </p>
        {playlist.description && (
          <p className="text-sm text-muted-foreground mt-2">{playlist.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-center mb-8">
        {!isOwner && (
          <>
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={isPending}>
              <Copy className="w-4 h-4 mr-1" />
              Copier
            </Button>
            <Button
              variant={following ? 'default' : 'outline'}
              size="sm"
              onClick={handleFollow}
            >
              {following ? <HeartOff className="w-4 h-4 mr-1" /> : <Heart className="w-4 h-4 mr-1" />}
              {following ? 'Ne plus suivre' : 'Suivre'}
            </Button>
          </>
        )}
        {songs.length > 0 && (
          <Button size="sm" onClick={handleLaunchReader}>
            <Play className="w-4 h-4 mr-1" />
            Lecture
          </Button>
        )}
      </div>

      {/* Song list */}
      <div className="space-y-2">
        {songs.map((song, index) => (
          <Link
            key={song.id}
            href={`/chansons/${song.slug}`}
            className="flex items-center gap-4 px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
          >
            <span className="text-sm text-muted-foreground w-6 text-right">{index + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{song.title}</p>
              <p className="text-sm text-muted-foreground">{song.artistName}</p>
            </div>
            <StyleBadge style={song.style as Style} />
          </Link>
        ))}
      </div>

      {/* Auth hint for visitors */}
      {!currentUserId && (
        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link href="/connexion" className="text-primary hover:underline">Connecte-toi</Link> pour copier ou suivre cette playlist.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Vérifier le build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/playlists/\[shareToken\]/page.tsx src/app/playlists/\[shareToken\]/PlaylistPublicClient.tsx
git commit -m "feat: add public playlist view with follow and copy actions"
```

---

### Task 9: Mode lecture plein écran avec auto-scroll

**Files:**
- Create: `src/app/playlists/[shareToken]/lecture/page.tsx`
- Create: `src/app/playlists/[shareToken]/lecture/PlaylistReaderClient.tsx`

- [ ] **Step 1: Créer le layout de lecture (pas de header/footer)**

La page de lecture sera rendue dans le layout racine mais on masquera le header/footer. Créer `src/app/playlists/[shareToken]/lecture/page.tsx` :

```typescript
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlaylistReaderClient } from './PlaylistReaderClient'

export const metadata: Metadata = {
  title: 'Mode lecture — Fenua Chords',
}

interface Props {
  params: Promise<{ shareToken: string }>
}

export default async function PlaylistReaderPage({ params }: Props) {
  const { shareToken } = await params
  const supabase = await createClient()

  const { data: playlist } = await supabase
    .from('playlists')
    .select('id, title, share_token, visibility, owner_id')
    .eq('share_token', shareToken)
    .single()

  if (!playlist || playlist.visibility === 'private') {
    // Allow private access only for owner
    const { data: { user } } = await supabase.auth.getUser()
    if (!playlist || playlist.owner_id !== user?.id) {
      notFound()
    }
  }

  const { data: songs } = await supabase
    .from('playlist_songs')
    .select('id, song_id, position, songs(id, title, slug, style, original_key, artists(name), chord_sheets(id, instrument, content, capo, tuning, votes_up, votes_down, is_official))')
    .eq('playlist_id', playlist.id)
    .order('position')

  const songItems = (songs ?? []).map((s) => {
    const song = s.songs as unknown as {
      id: string
      title: string
      slug: string
      style: string
      original_key: string | null
      artists: { name: string } | null
      chord_sheets: {
        id: string
        instrument: string
        content: string
        capo: number | null
        tuning: string | null
        votes_up: number
        votes_down: number
        is_official: boolean
      }[]
    }

    // Pick best sheet: official first, then highest votes
    const sheets = Array.isArray(song.chord_sheets) ? song.chord_sheets : []
    const bestSheet = sheets.sort((a, b) => {
      if (a.is_official !== b.is_official) return a.is_official ? -1 : 1
      return (b.votes_up - b.votes_down) - (a.votes_up - a.votes_down)
    })[0] ?? null

    return {
      id: s.id,
      songId: s.song_id,
      position: s.position,
      title: song.title,
      slug: song.slug,
      originalKey: song.original_key,
      artistName: Array.isArray(song.artists)
        ? (song.artists[0] as { name: string })?.name ?? ''
        : song.artists?.name ?? '',
      sheet: bestSheet ? { id: bestSheet.id, content: bestSheet.content, instrument: bestSheet.instrument, capo: bestSheet.capo } : null,
    }
  })

  return (
    <PlaylistReaderClient
      playlistTitle={playlist.title}
      shareToken={playlist.share_token}
      playlistId={playlist.id}
      songs={songItems}
    />
  )
}
```

- [ ] **Step 2: Créer `src/app/playlists/[shareToken]/lecture/PlaylistReaderClient.tsx`**

```typescript
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronLeft, ChevronRight, Minus, Plus, Play, Pause, ChevronsDown } from 'lucide-react'
import { ChordRenderer } from '@/components/ChordRenderer'
import { TransposeControls } from '@/components/TransposeControls'
import { transposeChordPro } from '@/lib/transpose'
import { usePlaylist } from '@/lib/playlist-context'

const SPEED_LABELS = ['Très lent', 'Lent', 'Normal', 'Rapide', 'Très rapide']
const SPEED_VALUES = [0.3, 0.6, 1.0, 1.8, 3.0] // pixels per frame
const FONT_SIZES = [12, 14, 16, 18, 22, 26]
const STORAGE_KEY_SPEED = 'fenua-autoscroll-speed'
const STORAGE_KEY_FONT = 'fenua-reader-fontsize'

interface SongData {
  id: string
  songId: string
  position: number
  title: string
  slug: string
  originalKey: string | null
  artistName: string
  sheet: { id: string; content: string; instrument: string; capo: number | null } | null
}

interface Props {
  playlistTitle: string
  shareToken: string
  playlistId: string
  songs: SongData[]
}

export function PlaylistReaderClient({ playlistTitle, shareToken, playlistId, songs }: Props) {
  const router = useRouter()
  const { active, activate, goToIndex, deactivate } = usePlaylist()

  const currentIndex = active?.currentIndex ?? 0
  const song = songs[currentIndex]

  const [semitones, setSemitones] = useState(0)
  const [fontSizeIndex, setFontSizeIndex] = useState(() => {
    if (typeof window === 'undefined') return 2
    const stored = sessionStorage.getItem(STORAGE_KEY_FONT)
    return stored ? parseInt(stored, 10) : 2
  })
  const [speedIndex, setSpeedIndex] = useState(() => {
    if (typeof window === 'undefined') return 2
    const stored = sessionStorage.getItem(STORAGE_KEY_SPEED)
    return stored ? parseInt(stored, 10) : 2
  })
  const [scrolling, setScrolling] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const userScrollRef = useRef(false)

  // Activate playlist context if not already
  useEffect(() => {
    if (!active || active.id !== playlistId) {
      activate({
        id: playlistId,
        title: playlistTitle,
        shareToken,
        songs: songs.map((s) => ({
          id: s.id,
          songId: s.songId,
          title: s.title,
          slug: s.slug,
          artistName: s.artistName,
          position: s.position,
        })),
      }, currentIndex)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Wake Lock API — prevent screen sleep
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null

    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen')
        }
      } catch {
        // Wake Lock not supported or denied
      }
    }

    requestWakeLock()

    // Re-acquire on visibility change
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      wakeLock?.release()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // Hide header/footer in reading mode
  useEffect(() => {
    document.body.classList.add('playlist-reader-active')
    return () => document.body.classList.remove('playlist-reader-active')
  }, [])

  // Auto-scroll logic
  useEffect(() => {
    if (!scrolling) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    function step() {
      if (userScrollRef.current) {
        userScrollRef.current = false
        setScrolling(false)
        return
      }
      window.scrollBy(0, SPEED_VALUES[speedIndex])
      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [scrolling, speedIndex])

  // Detect manual scroll → pause auto-scroll
  useEffect(() => {
    if (!scrolling) return
    let timeout: ReturnType<typeof setTimeout>

    function handleWheel() {
      userScrollRef.current = true
    }
    function handleTouch() {
      userScrollRef.current = true
    }

    window.addEventListener('wheel', handleWheel)
    window.addEventListener('touchmove', handleTouch)
    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchmove', handleTouch)
      clearTimeout(timeout)
    }
  }, [scrolling])

  // Persist speed & font size
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_SPEED, String(speedIndex))
  }, [speedIndex])
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_FONT, String(fontSizeIndex))
  }, [fontSizeIndex])

  // Reset semitones & scroll on song change
  useEffect(() => {
    setSemitones(0)
    window.scrollTo(0, 0)
    setScrolling(false)
  }, [currentIndex])

  function handleClose() {
    deactivate()
    router.push(`/playlists/${shareToken}`)
  }

  function handlePrev() {
    if (currentIndex > 0) goToIndex(currentIndex - 1)
  }

  function handleNext() {
    if (currentIndex < songs.length - 1) goToIndex(currentIndex + 1)
  }

  function adjustSpeed(delta: number) {
    setSpeedIndex((prev) => Math.max(0, Math.min(SPEED_VALUES.length - 1, prev + delta)))
  }

  function adjustFont(delta: number) {
    setFontSizeIndex((prev) => Math.max(0, Math.min(FONT_SIZES.length - 1, prev + delta)))
  }

  if (!song) return null

  const content = song.sheet ? transposeChordPro(song.sheet.content, semitones) : null

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-card border-b border-border shrink-0 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {currentIndex + 1}/{songs.length}
          </span>
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
            {playlistTitle}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Font size */}
          <button onClick={() => adjustFont(-1)} className="p-1.5 rounded hover:bg-muted text-xs font-bold" title="Réduire">
            A-
          </button>
          <button onClick={() => adjustFont(1)} className="p-1.5 rounded hover:bg-muted text-sm font-bold" title="Agrandir">
            A+
          </button>

          <span className="w-px h-4 bg-border mx-1" />

          {/* Transpose */}
          <button onClick={() => setSemitones((s) => s - 1)} className="p-1.5 rounded hover:bg-muted">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono w-6 text-center">
            {semitones > 0 ? `+${semitones}` : semitones}
          </span>
          <button onClick={() => setSemitones((s) => s + 1)} className="p-1.5 rounded hover:bg-muted">
            <Plus className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-border mx-1" />

          {/* Auto-scroll */}
          <button onClick={() => adjustSpeed(-1)} className="p-1.5 rounded hover:bg-muted" title="Ralentir">
            <ChevronsDown className="w-3.5 h-3.5 rotate-180" />
          </button>
          <button
            onClick={() => setScrolling((s) => !s)}
            className={`p-1.5 rounded ${scrolling ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            title={scrolling ? 'Pause auto-scroll' : 'Lancer auto-scroll'}
          >
            {scrolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => adjustSpeed(1)} className="p-1.5 rounded hover:bg-muted" title="Accélérer">
            <ChevronsDown className="w-3.5 h-3.5" />
          </button>
          {scrolling && (
            <span className="text-[10px] text-muted-foreground ml-0.5">{SPEED_LABELS[speedIndex]}</span>
          )}

          <span className="w-px h-4 bg-border mx-1" />

          <button onClick={handleClose} className="p-1.5 rounded hover:bg-muted" title="Quitter">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Song content */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="text-center mb-4">
            <h1 className="font-heading text-xl">{song.title}</h1>
            <p className="text-sm text-muted-foreground">{song.artistName}</p>
          </div>

          {content ? (
            <div style={{ fontSize: `${FONT_SIZES[fontSizeIndex]}px` }}>
              <ChordRenderer content={content} />
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Aucune grille d&apos;accords disponible pour ce chant.
            </p>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-t border-border shrink-0">
        <button
          onClick={handlePrev}
          disabled={currentIndex <= 0}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline truncate max-w-[120px]">
            {currentIndex > 0 ? songs[currentIndex - 1].title : ''}
          </span>
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex >= songs.length - 1}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <span className="hidden sm:inline truncate max-w-[120px]">
            {currentIndex < songs.length - 1 ? songs[currentIndex + 1].title : ''}
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Ajouter le CSS pour masquer header/footer en mode lecture**

Dans `src/app/globals.css`, ajouter :

```css
/* Hide header/footer in playlist reader mode */
.playlist-reader-active > header,
.playlist-reader-active > footer {
  display: none !important;
}
.playlist-reader-active > main {
  padding: 0 !important;
}
```

- [ ] **Step 4: Vérifier le build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/playlists/\[shareToken\]/lecture/ src/app/globals.css
git commit -m "feat: add fullscreen playlist reader with auto-scroll and wake lock"
```

---

### Task 10: PlaylistMiniBar — barre sticky bottom

**Files:**
- Create: `src/components/PlaylistMiniBar.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Créer `src/components/PlaylistMiniBar.tsx`**

```typescript
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, Maximize2, X, Music } from 'lucide-react'
import { usePlaylist } from '@/lib/playlist-context'

export function PlaylistMiniBar() {
  const { active, next, prev, deactivate } = usePlaylist()
  const router = useRouter()
  const pathname = usePathname()

  // Don't show on the reader page itself
  if (!active || pathname.includes('/lecture')) return null

  const currentSong = active.songs[active.currentIndex]
  if (!currentSong) return null

  function handleFullscreen() {
    router.push(`/playlists/${active!.shareToken}/lecture`)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t-2 border-primary shadow-lg">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-2 gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Music className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{active.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {active.currentIndex + 1}/{active.songs.length} — {currentSong.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={prev}
            disabled={active.currentIndex <= 0}
            className="p-2 rounded hover:bg-muted disabled:opacity-30 transition-colors"
            aria-label="Chant précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            disabled={active.currentIndex >= active.songs.length - 1}
            className="p-2 rounded hover:bg-muted disabled:opacity-30 transition-colors"
            aria-label="Chant suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleFullscreen}
            className="p-2 rounded hover:bg-muted transition-colors"
            aria-label="Mode lecture plein écran"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={deactivate}
            className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Fermer la playlist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Intégrer dans `src/app/layout.tsx`**

Ajouter l'import :

```typescript
import { PlaylistMiniBar } from "@/components/PlaylistMiniBar";
```

Ajouter le composant juste avant la fermeture de `</PlaylistProvider>` :

```tsx
<PlaylistProvider>
  <Header />
  <main className="flex-1">{children}</main>
  <Footer />
  <PlaylistMiniBar />
</PlaylistProvider>
```

- [ ] **Step 3: Vérifier le build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/PlaylistMiniBar.tsx src/app/layout.tsx
git commit -m "feat: add Spotify-style sticky playlist mini bar"
```

---

### Task 11: PlaylistShareModal — partage avec QR code

**Files:**
- Create: `src/components/PlaylistShareModal.tsx`
- Modify: `src/app/playlists/PlaylistManagerClient.tsx`

- [ ] **Step 1: Créer `src/components/PlaylistShareModal.tsx`**

```typescript
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Copy, Check, Globe, Link2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import type { Visibility } from '@/types/database'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  playlistId: string
  shareToken: string
  visibility: Visibility
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: typeof Globe; description: string }[] = [
  { value: 'private', label: 'Privée', icon: Lock, description: 'Visible uniquement par toi' },
  { value: 'link', label: 'Lien direct', icon: Link2, description: 'Accessible via le lien ou QR code' },
  { value: 'public', label: 'Publique', icon: Globe, description: 'Visible par tout le monde' },
]

export function PlaylistShareModal({ open, onOpenChange, playlistId, shareToken, visibility: initialVisibility }: Props) {
  const router = useRouter()
  const [visibility, setVisibility] = useState(initialVisibility)
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/playlists/${shareToken}`
    : `/playlists/${shareToken}`

  const canShare = visibility !== 'private'

  async function handleVisibilityChange(v: Visibility) {
    setVisibility(v)
    const supabase = createClient()
    await supabase.from('playlists').update({ visibility: v }).eq('id', playlistId)
    router.refresh()
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownloadQR() {
    if (!qrRef.current) return
    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = 512
      canvas.height = 512
      ctx?.drawImage(img, 0, 0, 512, 512)
      const a = document.createElement('a')
      a.download = `playlist-${shareToken}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partager ma playlist</DialogTitle>
        </DialogHeader>

        {/* Visibility selector */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Visibilité</p>
          <div className="grid gap-2">
            {VISIBILITY_OPTIONS.map((opt) => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.value}
                  onClick={() => handleVisibilityChange(opt.value)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    visibility === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* QR Code & Link */}
        {canShare ? (
          <div className="space-y-4 mt-4">
            <div ref={qrRef} className="flex justify-center">
              <QRCodeSVG value={shareUrl} size={200} level="M" />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCopyLink}>
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? 'Copié !' : 'Copier le lien'}
              </Button>
              <Button variant="outline" onClick={handleDownloadQR}>
                <Download className="w-4 h-4 mr-1" />
                QR PNG
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Passe ta playlist en <strong>Lien direct</strong> ou <strong>Publique</strong> pour la partager.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Intégrer dans `PlaylistManagerClient.tsx`**

Ajouter l'import en haut de `src/app/playlists/PlaylistManagerClient.tsx` :

```typescript
import { PlaylistShareModal } from '@/components/PlaylistShareModal'
```

Ajouter l'état dans le composant `PlaylistManagerClient` :

```typescript
const [shareOpen, setShareOpen] = useState(false)
```

Remplacer le bouton "Partager" (celui avec `id="share-playlist-trigger"`) par :

```tsx
<Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
  <Share2 className="w-4 h-4 mr-1" />
  Partager
</Button>
```

Ajouter le modal à la fin du return, avant la dernière `</div>` fermante :

```tsx
{playlist && (
  <PlaylistShareModal
    open={shareOpen}
    onOpenChange={setShareOpen}
    playlistId={playlist.id}
    shareToken={playlist.share_token}
    visibility={playlist.visibility}
  />
)}
```

Supprimer l'attribut `id="share-playlist-trigger"` qui n'est plus nécessaire.

- [ ] **Step 3: Vérifier le build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/PlaylistShareModal.tsx src/app/playlists/PlaylistManagerClient.tsx
git commit -m "feat: add playlist share modal with QR code and visibility controls"
```

---

### Task 12: Mise à jour du Header et navigation

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/components/UserMenu.tsx`
- Modify: `src/components/MobileMenu.tsx`

- [ ] **Step 1: Ajouter le lien "Ma playlist" dans le UserMenu**

Dans `src/components/UserMenu.tsx`, ajouter l'import :

```typescript
import { User, LogOut, Settings, FileText, Shield, ListMusic } from "lucide-react";
```

Ajouter le lien dans le dropdown, après "Mes contributions" :

```tsx
<Link
  href="/playlists"
  onClick={() => setOpen(false)}
  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
>
  <ListMusic className="w-4 h-4 text-muted-foreground" />
  Ma playlist
</Link>
```

- [ ] **Step 2: Ajouter le lien dans le MobileMenu**

Dans `src/components/MobileMenu.tsx`, ajouter après le lien "Mes contributions" (à l'intérieur du bloc `{user && ( ... )}`) :

```tsx
<Link
  href="/playlists"
  onClick={onClose}
  className={buttonVariants({ variant: "ghost", className: "w-full justify-start" })}
>
  Ma playlist
</Link>
```

- [ ] **Step 3: Vérifier le build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/UserMenu.tsx src/components/MobileMenu.tsx
git commit -m "feat: add playlist navigation links in user menu and mobile menu"
```

---

### Task 13: Vérification finale

- [ ] **Step 1: Build complet**

```bash
cd "/Users/maitoa/Desktop/Fenua-Chords/Fenua Chords"
npm run build
```

Expected: Build réussi sans erreur.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: Pas d'erreurs de lint.

- [ ] **Step 3: Vérification manuelle**

Tester dans le navigateur :
1. Se connecter → "Ma playlist" visible dans le menu user
2. Aller sur `/playlists` → voir le bouton de création
3. Créer une playlist → titre éditable, playlist vide
4. Aller sur `/chansons` → boutons "Playlist" sur les cartes
5. Ajouter 3-4 chants depuis le catalogue et la page chanson
6. Retourner sur `/playlists` → drag & drop fonctionne
7. Cliquer "Partager" → modal avec sélecteur visibilité + QR
8. Mettre en "Lien direct" → QR visible, copier le lien
9. Ouvrir le lien en navigation privée → vue publique, boutons Copier/Suivre
10. Lancer la lecture → mode plein écran, transposition, auto-scroll, prev/next
11. Quitter la lecture → mini-barre sticky visible en bas
12. Naviguer sur le site avec la mini-barre → prev/next fonctionnent
