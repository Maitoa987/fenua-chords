# Multi-Artistes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow songs to have multiple artists (many-to-many) with equal status, displayed as clickable tags.

**Architecture:** Replace `songs.artist_id` FK with a `song_artists` junction table. Migrate all existing data. Update all queries from `artists(name)` to `song_artists(artists(name))`. Refactor `ArtistAutocomplete` to multi-select. Add `ArtistTags` display component.

**Tech Stack:** Supabase (Postgres + RLS), Next.js 16 App Router, TypeScript, React, Tailwind, shadcn/ui

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/010_song_artists.sql` | Junction table, RLS, data migration, merge function |
| Modify | `src/types/database.ts` | Add `SongArtist`, remove `artist_id` from `Song` |
| Modify | `src/lib/validation.ts` | `songSchema`: `artistName` → `artists` array |
| Modify | `src/components/ArtistAutocomplete.tsx` | Refactor to multi-select with tags |
| Create | `src/components/ArtistTags.tsx` | Reusable display component for artist badges |
| Modify | `src/components/SongForm.tsx` | `artist` → `artists: ArtistValue[]` |
| Modify | `src/components/SongCard.tsx` | `artistName: string` → `artistNames: string[]` |
| Modify | `src/app/contribuer/page.tsx` | Multi-artist resolution + insert `song_artists` |
| Modify | `src/app/contribuer/[id]/edit/page.tsx` | Load/edit artists via `song_artists` |
| Modify | `src/app/chansons/page.tsx` | Query via `song_artists`, display multi-artists |
| Modify | `src/app/chansons/[slug]/page.tsx` | Query + display `ArtistTags` |
| Modify | `src/app/artistes/[slug]/page.tsx` | Query via `song_artists` |
| Modify | `src/app/page.tsx` | Query + display multi-artists |
| Modify | `src/app/mes-contributions/page.tsx` | Query via `song_artists` |
| Modify | `src/app/playlists/page.tsx` | Query via `song_artists` |
| Modify | `src/app/playlists/[shareToken]/page.tsx` | Query via `song_artists` |
| Modify | `src/app/playlists/[shareToken]/lecture/page.tsx` | Query via `song_artists` |
| Modify | `src/app/admin/artistes/page.tsx` | Count via `song_artists` |
| Modify | `src/app/admin/contenu/page.tsx` | Query via `song_artists` |

---

### Task 1: Migration SQL — Junction table + data migration

**Files:**
- Create: `supabase/migrations/010_song_artists.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/010_song_artists.sql

-- 1. Create junction table
CREATE TABLE song_artists (
  song_id    uuid REFERENCES songs(id) ON DELETE CASCADE,
  artist_id  uuid REFERENCES artists(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (song_id, artist_id)
);

CREATE INDEX idx_song_artists_artist ON song_artists(artist_id);

-- 2. Enable RLS
ALTER TABLE song_artists ENABLE ROW LEVEL SECURITY;

-- RLS: everyone can read
CREATE POLICY "Song artists are viewable by everyone"
  ON song_artists FOR SELECT USING (true);

-- RLS: non-banned authenticated users can insert
CREATE POLICY "Non-banned users can link song artists"
  ON song_artists FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND NOT public.is_banned());

-- RLS: song creator or admin can delete
CREATE POLICY "Song creator or admin can unlink artists"
  ON song_artists FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM songs WHERE songs.id = song_artists.song_id AND songs.created_by = auth.uid())
    OR public.is_admin()
  );

-- RLS: admin can do anything
CREATE POLICY "Admins can manage song artists"
  ON song_artists FOR ALL
  USING (public.is_admin());

-- 3. Migrate existing data
INSERT INTO song_artists (song_id, artist_id)
  SELECT id, artist_id FROM songs WHERE artist_id IS NOT NULL;

-- 4. Drop old column and index
DROP INDEX IF EXISTS idx_songs_artist;
ALTER TABLE songs DROP COLUMN artist_id;

-- 5. Update merge_artists function
CREATE OR REPLACE FUNCTION public.merge_artists(source_id uuid, target_id uuid)
RETURNS void AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  -- Transfer links, skip duplicates
  INSERT INTO song_artists (song_id, artist_id)
    SELECT song_id, target_id FROM song_artists WHERE artist_id = source_id
    ON CONFLICT DO NOTHING;
  -- Remove old links
  DELETE FROM song_artists WHERE artist_id = source_id;
  -- Delete source artist
  DELETE FROM artists WHERE id = source_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db push` (or apply via Supabase dashboard)
Expected: Migration applies without errors

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/010_song_artists.sql
git commit -m "feat: add song_artists junction table + migrate data"
```

---

### Task 2: TypeScript types + validation

**Files:**
- Modify: `src/types/database.ts:29-42`
- Modify: `src/lib/validation.ts:3-13`

- [ ] **Step 1: Update Song interface and add SongArtist**

In `src/types/database.ts`, remove `artist_id` from `Song` and add `SongArtist`:

```typescript
// Remove artist_id from Song (line 33)
export interface Song {
  id: string
  title: string
  slug: string
  style: Style
  language: string | null
  original_key: string | null
  bpm: number | null
  youtube_url: string | null
  created_by: string
  status: SongStatus
  created_at: string
}

// Add after Song interface
export interface SongArtist {
  song_id: string
  artist_id: string
  created_at: string
}
```

- [ ] **Step 2: Update validation schema**

In `src/lib/validation.ts`, replace the single artist fields with an artists array:

```typescript
import { z } from "zod"

const artistSchema = z.object({
  id: z.union([
    z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "Identifiant artiste invalide"),
    z.null(),
  ]),
  name: z.string().trim().min(1, "Le nom d'artiste est requis").max(100, "Le nom d'artiste ne peut pas depasser 100 caracteres"),
})

export const songSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis").max(200, "Le titre ne peut pas depasser 200 caracteres"),
  artists: z.array(artistSchema).min(1, "Au moins un artiste est requis"),
  style: z.enum(["bringue", "himene", "variete", "traditionnel", "autre"]),
  instrument: z.enum(["guitare", "ukulele", "basse", "ukulele-bass"]),
  originalKey: z.string().max(10).regex(/^([A-G][#b]?m?[0-9]?)?$/, "Tonalite invalide").or(z.literal("")),
  capo: z.number().int().min(0).max(12),
  tuning: z.string().max(50).optional().default(""),
  content: z.string().trim().min(1, "Le contenu des accords est requis").max(50000, "Le contenu ne peut pas depasser 50 000 caracteres"),
})

export const editSheetSchema = z.object({
  instrument: z.enum(["guitare", "ukulele", "basse", "ukulele-bass"]),
  capo: z.number().int().min(0).max(12),
  tuning: z.string().max(50).optional().default(""),
  content: z.string().trim().min(1, "Le contenu des accords est requis").max(50000, "Le contenu ne peut pas depasser 50 000 caracteres"),
})

export type SongInput = z.infer<typeof songSchema>
export type EditSheetInput = z.infer<typeof editSheetSchema>
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: May show errors in files not yet updated — that's expected at this stage

- [ ] **Step 4: Commit**

```bash
git add src/types/database.ts src/lib/validation.ts
git commit -m "feat: update types and validation for multi-artists"
```

---

### Task 3: ArtistAutocomplete — refactor to multi-select

**Files:**
- Modify: `src/components/ArtistAutocomplete.tsx`

- [ ] **Step 1: Rewrite ArtistAutocomplete as multi-select**

Replace the entire content of `src/components/ArtistAutocomplete.tsx`:

```typescript
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { XIcon } from "lucide-react"

export interface ArtistValue {
  id: string | null
  name: string
}

interface ArtistAutocompleteProps {
  value: ArtistValue[]
  onChange: (value: ArtistValue[]) => void
}

const supabase = createClient()

export function ArtistAutocomplete({ value, onChange }: ArtistAutocompleteProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ArtistValue[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from("artists")
      .select("id, name")
      .ilike("name", `%${q}%`)
      .limit(8)
    setResults((data ?? []).map((a) => ({ id: a.id as string, name: a.name as string })))
    setLoading(false)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      search(query)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filter out already-selected artists from results
  const selectedIds = new Set(value.map((a) => a.id).filter(Boolean))
  const selectedNames = new Set(value.map((a) => a.name.toLowerCase()))
  const filteredResults = results.filter(
    (r) => !selectedIds.has(r.id) && !selectedNames.has(r.name.toLowerCase())
  )

  function selectExisting(artist: ArtistValue) {
    onChange([...value, artist])
    setQuery("")
    setOpen(false)
    setResults([])
    // Re-focus input for next artist
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function selectNew() {
    onChange([...value, { id: null, name: query.trim() }])
    setQuery("")
    setOpen(false)
    setResults([])
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function removeArtist(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  const showCreateOption =
    query.trim().length > 0 &&
    !results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase()) &&
    !selectedNames.has(query.trim().toLowerCase())

  return (
    <div ref={containerRef} className="relative">
      {/* Selected artists as tags + input */}
      <div className="flex flex-wrap items-center gap-1.5 min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
        {value.map((artist, index) => (
          <span
            key={`${artist.id ?? artist.name}-${index}`}
            className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm font-medium"
          >
            {artist.name}
            {artist.id === null && (
              <span className="text-xs opacity-60 ml-0.5">(nouveau)</span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => removeArtist(index)}
              className="ml-0.5 hover:opacity-70 rounded-full"
              aria-label={`Retirer ${artist.name}`}
            >
              <XIcon />
            </Button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder={value.length === 0 ? "Nom de l'artiste" : "Ajouter un artiste..."}
          className="flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground"
          autoComplete="off"
        />
      </div>

      {/* Dropdown */}
      {open && (filteredResults.length > 0 || showCreateOption || loading) && (
        <div className="absolute z-20 w-full mt-1 shadow-lg rounded-xl overflow-hidden border border-border">
          <Command shouldFilter={false}>
            <CommandList>
              {loading && (
                <CommandEmpty>Recherche...</CommandEmpty>
              )}
              {!loading && filteredResults.length === 0 && !showCreateOption && (
                <CommandEmpty>Aucun resultat.</CommandEmpty>
              )}
              {!loading && filteredResults.length > 0 && (
                <CommandGroup>
                  {filteredResults.map((artist) => (
                    <CommandItem
                      key={artist.id}
                      value={artist.name}
                      onSelect={() => selectExisting(artist)}
                    >
                      {artist.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {!loading && showCreateOption && (
                <CommandGroup>
                  <CommandItem
                    value={`__create__${query.trim()}`}
                    onSelect={selectNew}
                    className="text-primary font-medium"
                  >
                    Creer &ldquo;{query.trim()}&rdquo;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors in the component**

Run: `npx tsc --noEmit src/components/ArtistAutocomplete.tsx` (or full build later)

- [ ] **Step 3: Commit**

```bash
git add src/components/ArtistAutocomplete.tsx
git commit -m "feat: refactor ArtistAutocomplete to multi-select with tags"
```

---

### Task 4: ArtistTags display component

**Files:**
- Create: `src/components/ArtistTags.tsx`

- [ ] **Step 1: Create ArtistTags component**

```typescript
import Link from "next/link"

interface ArtistTagsProps {
  artists: { name: string; slug: string }[]
  className?: string
}

export function ArtistTags({ artists, className }: ArtistTagsProps) {
  if (artists.length === 0) return null

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      {artists.map((artist) => (
        <Link
          key={artist.slug}
          href={`/artistes/${artist.slug}`}
          className="inline-flex items-center bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-0.5 rounded-full text-sm font-medium transition-colors"
        >
          {artist.name}
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ArtistTags.tsx
git commit -m "feat: add ArtistTags display component"
```

---

### Task 5: SongForm — multi-artists

**Files:**
- Modify: `src/components/SongForm.tsx:15-23,78-88`

- [ ] **Step 1: Update SongFormData and form rendering**

In `src/components/SongForm.tsx`, change the `SongFormData` interface and artist field:

Replace `artist: ArtistValue | null` with `artists: ArtistValue[]` in the interface:

```typescript
export interface SongFormData {
  title: string
  artists: ArtistValue[]
  style: Style
  instrument: Instrument
  originalKey: string
  capo: number
  tuning: string
}
```

Replace the artist section in the JSX (the `{/* Artist -- span 2 */}` block, lines 78-88):

```typescript
      {/* Artists — span 2 */}
      <div className="sm:col-span-2 space-y-1">
        <Label>Artiste(s) <span className="text-destructive">*</span></Label>
        <ArtistAutocomplete
          value={data.artists}
          onChange={(v) => onChange({ ...data, artists: v })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Si un artiste n&apos;existe pas encore, il sera cree automatiquement.
        </p>
      </div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SongForm.tsx
git commit -m "feat: update SongForm for multi-artists"
```

---

### Task 6: SongCard — multi-artists display

**Files:**
- Modify: `src/components/SongCard.tsx:8-17,25`

- [ ] **Step 1: Update SongCard props and display**

Change `artistName: string` to `artistNames: string[]` in the props and display:

```typescript
interface SongCardProps {
  songId: string;
  title: string;
  slug: string;
  artistNames: string[];
  style: Style;
  originalKey: string | null;
}

export function SongCard({ songId, title, slug, artistNames, style, originalKey }: SongCardProps) {
```

Replace line 25 (`<p className="text-sm text-muted-foreground">{artistName}</p>`) with:

```typescript
              <p className="text-sm text-muted-foreground">{artistNames.join(", ")}</p>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SongCard.tsx
git commit -m "feat: update SongCard for multi-artists"
```

---

### Task 7: Contribuer page — multi-artist creation flow

**Files:**
- Modify: `src/app/contribuer/page.tsx:14-22,33-36,44-54,113-154`

- [ ] **Step 1: Update DEFAULT_FORM**

```typescript
const DEFAULT_FORM: SongFormData = {
  title: "",
  artists: [],
  style: "bringue",
  instrument: "guitare",
  originalKey: "",
  capo: 0,
  tuning: "",
}
```

- [ ] **Step 2: Update canSubmit check**

Replace line 33-37:

```typescript
  const canSubmit =
    formData.title.trim().length > 0 &&
    formData.artists.length > 0 &&
    content.trim().length > 0 &&
    !loading
```

- [ ] **Step 3: Update validation call**

Replace the `songSchema.safeParse` call (lines 44-54):

```typescript
    const parsed = songSchema.safeParse({
      title: formData.title,
      artists: formData.artists.map((a) => ({ id: a.id, name: a.name })),
      style: formData.style,
      instrument: formData.instrument,
      originalKey: formData.originalKey,
      capo: formData.capo,
      tuning: formData.tuning,
      content,
    })
```

- [ ] **Step 4: Replace single-artist resolution with multi-artist loop**

Replace lines 113-141 (the `// Find or create artist` block) with:

```typescript
      // Resolve all artists
      if (formData.artists.length === 0) throw new Error("Au moins un artiste requis")
      const artistIds: string[] = []

      for (const artist of formData.artists) {
        if (artist.id) {
          artistIds.push(artist.id)
        } else {
          const artistSlug = slugify(artist.name)
          const { data: existingArtist } = await supabase
            .from("artists")
            .select("id")
            .eq("slug", artistSlug)
            .single()

          if (existingArtist) {
            artistIds.push(existingArtist.id)
          } else {
            const { data: newArtist, error: artistError } = await supabase
              .from("artists")
              .insert({ name: artist.name, slug: artistSlug })
              .select("id")
              .single()

            if (artistError || !newArtist) {
              throw new Error(`Impossible de creer l'artiste ${artist.name}`)
            }
            artistIds.push(newArtist.id)
          }
        }
      }
```

- [ ] **Step 5: Update song creation — remove artist_id, use first artist for slug**

Replace the song creation block (lines 143-171):

```typescript
      // Create song with slug collision retry
      const firstArtistName = formData.artists[0].name
      const songSlug = slugify(`${firstArtistName}-${parsed.data.title}`)
      let song = null

      for (let attempt = 0; attempt < 5; attempt++) {
        const trySlug = attempt === 0 ? songSlug : `${songSlug}-${attempt}`
        const result = await supabase
          .from("songs")
          .insert({
            title: parsed.data.title,
            slug: trySlug,
            style: parsed.data.style,
            original_key: parsed.data.originalKey || null,
            created_by: user.id,
            status: "published",
          })
          .select("id, slug")
          .single()

        if (!result.error) {
          song = result.data
          break
        }
        if (!result.error.message.includes("unique") && !result.error.message.includes("duplicate")) {
          throw new Error("Impossible de creer la chanson")
        }
      }

      if (!song) throw new Error("Impossible de creer la chanson (slug en conflit)")

      // Link all artists
      const { error: linkError } = await supabase
        .from("song_artists")
        .insert(artistIds.map((artistId) => ({ song_id: song.id, artist_id: artistId })))

      if (linkError) {
        throw new Error("Impossible de lier les artistes")
      }
```

- [ ] **Step 6: Commit**

```bash
git add src/app/contribuer/page.tsx
git commit -m "feat: update contribuer page for multi-artists"
```

---

### Task 8: Edit page — load and modify artists

**Files:**
- Modify: `src/app/contribuer/[id]/edit/page.tsx`

- [ ] **Step 1: Add artist imports and state**

Add imports at top:

```typescript
import { ArtistAutocomplete, type ArtistValue } from "@/components/ArtistAutocomplete"
import { slugify } from "@/lib/slugify"
```

Add to `SheetData` interface — add a `song_id` reference to load artists:

No change needed to `SheetData` — we already have `song_id`.

Add state after the existing state declarations (after line 64):

```typescript
  const [artists, setArtists] = useState<ArtistValue[]>([])
  const [initialArtists, setInitialArtists] = useState<ArtistValue[]>([])
```

- [ ] **Step 2: Load artists in the useEffect load function**

After the sheet is loaded (after line 101, before `setLoading(false)`), add:

```typescript
      // Load artists for this song
      const { data: songArtists } = await supabase
        .from("song_artists")
        .select("artists(id, name)")
        .eq("song_id", (typedData as SheetData).song_id)

      const loadedArtists: ArtistValue[] = (songArtists ?? []).map((sa) => {
        const a = (sa as unknown as { artists: { id: string; name: string } }).artists
        return { id: a.id, name: a.name }
      })
      setArtists(loadedArtists)
      setInitialArtists(loadedArtists)
```

- [ ] **Step 3: Add artists section in the JSX**

After the `<h2 className="text-lg font-semibold">Parametres</h2>` section closing `</section>` tag (after line 288), add a new section:

```typescript
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Artiste(s)</h2>
        <ArtistAutocomplete value={artists} onChange={setArtists} />
        <p className="text-xs text-muted-foreground">
          Modifie les artistes associes a cette chanson.
        </p>
      </section>
```

- [ ] **Step 4: Save artist changes in handleSave**

In `handleSave`, after the chord_sheets update succeeds (after line 186), add:

```typescript
      // Save artist changes if modified
      const initialIds = new Set(initialArtists.map((a) => a.id))
      const currentIds = new Set<string | null>()

      // Resolve new artists and collect all current IDs
      const resolvedArtistIds: string[] = []
      for (const artist of artists) {
        if (artist.id) {
          resolvedArtistIds.push(artist.id)
          currentIds.add(artist.id)
        } else {
          const artistSlug = slugify(artist.name)
          const { data: existing } = await supabase
            .from("artists")
            .select("id")
            .eq("slug", artistSlug)
            .single()

          if (existing) {
            resolvedArtistIds.push(existing.id)
            currentIds.add(existing.id)
          } else {
            const { data: created } = await supabase
              .from("artists")
              .insert({ name: artist.name, slug: artistSlug })
              .select("id")
              .single()
            if (created) {
              resolvedArtistIds.push(created.id)
              currentIds.add(created.id)
            }
          }
        }
      }

      // Diff: remove artists no longer selected
      const toRemove = initialArtists
        .filter((a) => a.id && !currentIds.has(a.id))
        .map((a) => a.id!)

      if (toRemove.length > 0) {
        await supabase
          .from("song_artists")
          .delete()
          .eq("song_id", sheet.song_id)
          .in("artist_id", toRemove)
      }

      // Diff: add newly selected artists
      const toAdd = resolvedArtistIds.filter((id) => !initialIds.has(id))
      if (toAdd.length > 0) {
        await supabase
          .from("song_artists")
          .insert(toAdd.map((artistId) => ({ song_id: sheet.song_id, artist_id: artistId })))
      }
```

- [ ] **Step 5: Commit**

```bash
git add src/app/contribuer/[id]/edit/page.tsx
git commit -m "feat: add artist editing to chord sheet edit page"
```

---

### Task 9: Song detail page — multi-artists

**Files:**
- Modify: `src/app/chansons/[slug]/page.tsx:22-24,52-55,65,129-136,146`

- [ ] **Step 1: Update generateMetadata query**

Replace lines 21-24:

```typescript
  const { data: song } = await supabase
    .from('songs')
    .select('title, song_artists(artists(name))')
    .eq('slug', slug)
    .single()
```

Replace lines 31-33 (artist extraction in metadata):

```typescript
  const songArtists = (song.song_artists as unknown as { artists: { name: string } }[]) ?? []
  const artistNamesStr = songArtists.map((sa) => sa.artists.name).join(", ")
  const title = `${song.title}${artistNamesStr ? ` — ${artistNamesStr}` : ''} | Fenua Chords`
  const description = `Accords et paroles de ${song.title}${artistNamesStr ? ` par ${artistNamesStr}` : ''} sur Fenua Chords.`
```

- [ ] **Step 2: Update main query**

Replace line 54-55 (the select string):

```typescript
      'id, title, slug, style, original_key, bpm, youtube_url, song_artists(artists(name, slug)), chord_sheets(id, instrument, tuning, capo, content, contributed_by, votes_up, votes_down, is_official, created_at, updated_at, last_edited_by, profiles:contributed_by(username), editor:last_edited_by(username))'
```

- [ ] **Step 3: Update artist extraction and display**

Replace line 65:

```typescript
  const songArtists = (song.song_artists as unknown as { artists: { name: string; slug: string } }[]) ?? []
  const artists = songArtists.map((sa) => sa.artists)
```

Add import at top:

```typescript
import { ArtistTags } from '@/components/ArtistTags'
```

Replace lines 129-136 (the artist link block):

```typescript
        {artists.length > 0 && (
          <ArtistTags artists={artists} className="mt-2" />
        )}
```

Replace line 146 (`artistName={artist?.name ?? ''}`):

```typescript
        artistName={artists.map((a) => a.name).join(', ')}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/chansons/[slug]/page.tsx
git commit -m "feat: update song detail page for multi-artists"
```

---

### Task 10: Songs list page + homepage — multi-artists

**Files:**
- Modify: `src/app/chansons/page.tsx:32,37,85-87,89-97`
- Modify: `src/app/page.tsx:27,109-118`

- [ ] **Step 1: Update chansons/page.tsx**

Replace the query select (line 32):

```typescript
    .select("id, title, slug, style, original_key, song_artists(artists(name))")
```

Replace the search filter (line 37) — note: searching across junction table requires a different approach. Since Supabase `or` filter with nested relations is limited, we search title only and filter artist name client-side or use a separate approach:

```typescript
  if (q) {
    query = query.ilike("title", `%${q}%`)
  }
```

> Note: Full-text search across artist names via junction table would require an RPC or a view. For now, title-only search is a pragmatic first step. A follow-up can add artist name search via RPC.

Replace the artist extraction in the map (lines 85-97):

```typescript
          {songs.map((song) => {
            const songArtists = (song.song_artists as unknown as { artists: { name: string } }[]) ?? []
            const artistNames = songArtists.map((sa) => sa.artists.name)
            return (
              <SongCard
                key={song.id}
                songId={song.id}
                title={song.title}
                slug={song.slug}
                artistNames={artistNames}
                style={song.style as Style}
                originalKey={song.original_key}
              />
            );
          })}
```

- [ ] **Step 2: Update page.tsx (homepage)**

Replace the query select (line 27):

```typescript
      .select("id, title, slug, style, original_key, song_artists(artists(name))")
```

Replace the artist extraction in the map (lines 108-123):

```typescript
            {recentSongs.map((song) => {
              const songArtists = (song.song_artists as unknown as { artists: { name: string } }[]) ?? []
              const artistNames = songArtists.map((sa) => sa.artists.name)
              return (
                <SongCard
                  key={song.id}
                  songId={song.id}
                  title={song.title}
                  slug={song.slug}
                  artistNames={artistNames}
                  style={song.style as Style}
                  originalKey={song.original_key}
                />
              );
            })}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/chansons/page.tsx src/app/page.tsx
git commit -m "feat: update songs list and homepage for multi-artists"
```

---

### Task 11: Artist detail page — query via song_artists

**Files:**
- Modify: `src/app/artistes/[slug]/page.tsx:47-52,94-100`

- [ ] **Step 1: Update songs query**

Replace lines 47-52:

```typescript
  const { data: songArtistRows } = await supabase
    .from("song_artists")
    .select("songs(id, title, slug, style, original_key)")
    .eq("artist_id", artist.id)

  const songs = (songArtistRows ?? [])
    .map((row) => (row as unknown as { songs: { id: string; title: string; slug: string; style: string; original_key: string | null } }).songs)
    .filter((s) => s !== null)
```

Note: We can't filter by `status = 'published'` directly on the nested `songs` relation in Supabase. To handle this, we filter client-side or use an RPC. For simplicity, filter client-side:

```typescript
  // Filter published songs
  const { data: publishedSongIds } = await supabase
    .from("songs")
    .select("id")
    .eq("status", "published")

  const publishedIds = new Set((publishedSongIds ?? []).map((s) => s.id))

  const { data: songArtistRows } = await supabase
    .from("song_artists")
    .select("songs(id, title, slug, style, original_key, status)")
    .eq("artist_id", artist.id)

  const songs = (songArtistRows ?? [])
    .map((row) => (row as unknown as { songs: { id: string; title: string; slug: string; style: string; original_key: string | null; status: string } }).songs)
    .filter((s) => s !== null && s.status === "published")
    .sort((a, b) => a.title.localeCompare(b.title))
```

- [ ] **Step 2: Update SongCard usage**

Replace the SongCard rendering (lines 94-106):

```typescript
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {songs.map((song) => (
            <SongCard
              key={song.id}
              songId={song.id}
              title={song.title}
              slug={song.slug}
              artistNames={[artist.name]}
              style={song.style as Style}
              originalKey={song.original_key}
            />
          ))}
        </div>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/artistes/[slug]/page.tsx
git commit -m "feat: update artist detail page to query via song_artists"
```

---

### Task 12: Mes contributions page — multi-artists

**Files:**
- Modify: `src/app/mes-contributions/page.tsx:26-28,38-39,94-98`

- [ ] **Step 1: Update query**

Replace line 28:

```typescript
    .select('id, title, slug, style, created_at, song_artists(artists(name)), chord_sheets(id, instrument, contributed_by)')
```

- [ ] **Step 2: Update SongRaw type**

Replace lines 32-41:

```typescript
  type SongRaw = {
    id: string
    title: string
    slug: string
    style: string
    created_at: string
    song_artists: { artists: { name: string } }[]
    chord_sheets: { id: string; instrument: string; contributed_by: string }[]
  }
```

- [ ] **Step 3: Update artist display**

Replace lines 94-98:

```typescript
                    {song.song_artists.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        — {song.song_artists.map((sa) => sa.artists.name).join(", ")}
                      </span>
                    )}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/mes-contributions/page.tsx
git commit -m "feat: update mes-contributions for multi-artists"
```

---

### Task 13: Playlist pages — multi-artists

**Files:**
- Modify: `src/app/playlists/page.tsx:25-26,31,75`
- Modify: `src/app/playlists/[shareToken]/page.tsx:50,72,80-82`
- Modify: `src/app/playlists/[shareToken]/lecture/page.tsx:34,39-46,72-74`

- [ ] **Step 1: Update playlists/page.tsx**

Replace the type and query (lines 21-26 and 31):

```typescript
  let songs: {
    id: string
    song_id: string
    position: number
    songs: { id: string; title: string; slug: string; style: string; song_artists: { artists: { name: string } }[] } | null
  }[] = []
```

Replace query select (line 31):

```typescript
      .select('id, song_id, position, songs(id, title, slug, style, song_artists(artists(name)))')
```

Replace the artistName mapping (line 75):

```typescript
            artistName: song?.song_artists?.map((sa: { artists: { name: string } }) => sa.artists.name).join(', ') ?? '',
```

Note: `PlaylistManagerClient` receives `artistName` as a string — so we join the names. This keeps the client component interface simple.

- [ ] **Step 2: Update playlists/[shareToken]/page.tsx**

Replace query select (line 50):

```typescript
    .select('id, song_id, position, songs(id, title, slug, style, song_artists(artists(name)))')
```

Replace song type cast (line 72):

```typescript
    const song = s.songs as unknown as { id: string; title: string; slug: string; style: string; song_artists: { artists: { name: string } }[] }
```

Replace artistName extraction (lines 80-82):

```typescript
      artistName: song.song_artists?.map((sa) => sa.artists.name).join(', ') ?? '',
```

- [ ] **Step 3: Update playlists/[shareToken]/lecture/page.tsx**

Replace query select (line 34):

```typescript
    .select('id, song_id, position, songs(id, title, slug, style, original_key, song_artists(artists(name)), chord_sheets(id, instrument, content, capo, tuning, votes_up, votes_down, is_official))')
```

Replace the song type (lines 39-46):

```typescript
    const song = s.songs as unknown as {
      id: string
      title: string
      slug: string
      style: string
      original_key: string | null
      song_artists: { artists: { name: string } }[]
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
```

Replace artistName extraction (lines 72-74):

```typescript
      artistName: song.song_artists?.map((sa) => sa.artists.name).join(', ') ?? '',
```

- [ ] **Step 4: Commit**

```bash
git add src/app/playlists/page.tsx src/app/playlists/[shareToken]/page.tsx src/app/playlists/[shareToken]/lecture/page.tsx
git commit -m "feat: update playlist pages for multi-artists"
```

---

### Task 14: Admin pages — multi-artists

**Files:**
- Modify: `src/app/admin/artistes/page.tsx:9-11,14-19`
- Modify: `src/app/admin/contenu/page.tsx:7-14,22-27,51,67`

- [ ] **Step 1: Update admin/artistes/page.tsx**

Replace the query (lines 9-12):

```typescript
  const { data: artists } = await supabase
    .from("artists")
    .select("id, name, origin, slug, song_artists(count)")
    .order("name", { ascending: true })
```

Replace the count extraction (lines 14-19):

```typescript
  const artistsWithCount = (artists ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    origin: a.origin as string | null,
    slug: a.slug,
    songCount: Array.isArray(a.song_artists) ? (a.song_artists[0] as { count: number })?.count ?? 0 : 0,
  }))
```

- [ ] **Step 2: Update admin/contenu/page.tsx**

Replace the `SongRow` interface (lines 7-14):

```typescript
interface SongRow {
  id: string
  title: string
  style: Style
  created_at: string
  song_artists: { artists: { name: string } }[]
  profiles: { username: string } | null
  chord_sheets: { id: string; instrument: Instrument }[]
}
```

Replace the query select (lines 22-29):

```typescript
  const { data: songs } = await supabase
    .from("songs")
    .select(`
      id,
      title,
      style,
      created_at,
      song_artists(artists(name)),
      profiles:created_by(username),
      chord_sheets(id, instrument)
    `)
    .order("created_at", { ascending: false })
    .limit(50)
```

Replace artist extraction (line 51):

```typescript
            const artistNames = song.song_artists.map((sa) => sa.artists.name).join(", ")
```

Replace artist display (line 67):

```typescript
                      {artistNames || "—"} · par {profile?.username ?? "inconnu"} ·{" "}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/artistes/page.tsx src/app/admin/contenu/page.tsx
git commit -m "feat: update admin pages for multi-artists"
```

---

### Task 15: Build verification + final commit

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: No errors (or only pre-existing warnings)

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Fix any errors found**

If any errors, fix them and commit:

```bash
git add -A
git commit -m "fix: resolve build errors from multi-artists migration"
```

- [ ] **Step 5: Manual test checklist**

Verify in the browser:
- [ ] Homepage shows songs with multiple artist names
- [ ] Songs list page shows artist names correctly
- [ ] Song detail page shows artist tags (clickable)
- [ ] Artist detail page shows all songs linked via junction table
- [ ] Contribute form: can add multiple artists
- [ ] Edit form: can modify artists
- [ ] Playlist pages show artist names
- [ ] Admin artist page shows correct song counts
- [ ] Admin merge artists works correctly
