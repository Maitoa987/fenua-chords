# Admin Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin panel for managing users (ban), content (delete), and artists (merge duplicates) with a stats dashboard.

**Architecture:** Add `role` and `is_banned` columns to `profiles`. Admin-only RLS policies allow admins to delete any content and update any profile. Server-side `requireAdmin()` guard protects `/admin` routes. All admin pages are server components (SSR) for security — no client-side admin actions bypass RLS. Banned users are blocked from creating content via updated RLS policies.

**Tech Stack:** Next.js 16 App Router, Supabase (RLS + RPC), shadcn/ui (Card, Button, Table-like layouts, Badge, Alert, Tabs, Input), Tailwind CSS v4.

---

## File Structure

```
supabase/
  migrations/
    005_admin.sql                       # role + is_banned columns, admin RLS policies, ban RPC

src/
  lib/
    admin-guard.ts                      # requireAdmin() server guard
  app/
    admin/
      layout.tsx                        # Admin layout with nav tabs
      page.tsx                          # Dashboard stats
      utilisateurs/
        page.tsx                        # User list + ban/unban
      contenu/
        page.tsx                        # Songs + chord sheets management
      artistes/
        page.tsx                        # Artist list + merge duplicates
  types/
    database.ts                         # Update Profile type
```

---

## Task 1: Database Migration — role, is_banned, admin RLS

**Files:**
- Create: `supabase/migrations/005_admin.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Write admin migration**

```sql
-- supabase/migrations/005_admin.sql

-- Add role and ban columns to profiles
alter table profiles add column if not exists role text not null default 'user';
alter table profiles add column if not exists is_banned boolean not null default false;

-- Index for admin lookups
create index if not exists idx_profiles_role on profiles(role);

-- Helper function: check if current user is admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer stable;

-- Helper function: check if current user is banned
create or replace function public.is_banned()
returns boolean as $$
begin
  return exists (
    select 1 from profiles
    where id = auth.uid() and is_banned = true
  );
end;
$$ language plpgsql security definer stable;

-- ADMIN RLS: admins can do everything

-- Admins can see all songs (including drafts)
create policy "Admins can view all songs"
  on songs for select using (public.is_admin());

-- Admins can delete any song
create policy "Admins can delete any song"
  on songs for delete using (public.is_admin());

-- Admins can update any song
create policy "Admins can update any song"
  on songs for update using (public.is_admin());

-- Admins can delete any chord sheet
create policy "Admins can delete any chord sheet"
  on chord_sheets for delete using (public.is_admin());

-- Admins can update any profile (for banning)
create policy "Admins can update any profile"
  on profiles for update using (public.is_admin());

-- Admins can delete any artist
create policy "Admins can delete any artist"
  on artists for delete using (public.is_admin());

-- Admins can update any artist (for merging)
create policy "Admins can update any artist"
  on artists for update using (public.is_admin());

-- BANNED USERS: block content creation

-- Drop existing insert policies and recreate with ban check
drop policy if exists "Authenticated users can create songs" on songs;
create policy "Non-banned users can create songs"
  on songs for insert with check (
    auth.role() = 'authenticated' and not public.is_banned()
  );

drop policy if exists "Authenticated users can create chord sheets" on chord_sheets;
create policy "Non-banned users can create chord sheets"
  on chord_sheets for insert with check (
    auth.role() = 'authenticated' and not public.is_banned()
  );

drop policy if exists "Authenticated users can create artists" on artists;
create policy "Non-banned users can create artists"
  on artists for insert with check (
    auth.role() = 'authenticated' and not public.is_banned()
  );

-- RPC: merge two artists (reassign songs, delete source)
create or replace function public.merge_artists(source_id uuid, target_id uuid)
returns void as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  -- Reassign all songs from source to target
  update songs set artist_id = target_id where artist_id = source_id;

  -- Delete source artist
  delete from artists where id = source_id;
end;
$$ language plpgsql security definer;

-- Set yourself as admin (run this ONCE with your user ID)
-- update profiles set role = 'admin' where id = '<YOUR_USER_ID>';
```

- [ ] **Step 2: Update TypeScript types**

Add `role` and `is_banned` to the Profile interface in `src/types/database.ts`:

```typescript
export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
  role: UserRole
  is_banned: boolean
  created_at: string
}
```

- [ ] **Step 3: Run migration in Supabase SQL Editor**

User action: paste `005_admin.sql` in Supabase SQL Editor and run it. Then set yourself as admin:
```sql
update profiles set role = 'admin' where id = '<YOUR_USER_ID>';
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/005_admin.sql src/types/database.ts
git commit -m "feat: add admin role, ban system, admin RLS policies"
```

---

## Task 2: Admin Guard + Admin Layout

**Files:**
- Create: `src/lib/admin-guard.ts`
- Create: `src/app/admin/layout.tsx`

- [ ] **Step 1: Create admin guard**

```tsx
// src/lib/admin-guard.ts
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/connexion")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    redirect("/")
  }

  return user
}
```

- [ ] **Step 2: Create admin layout with tabs**

```tsx
// src/app/admin/layout.tsx
import Link from "next/link"
import { requireAdmin } from "@/lib/admin-guard"
import { Shield } from "lucide-react"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="font-heading text-2xl text-primary">Administration</h1>
      </div>

      <nav className="flex gap-2 mb-8 border-b border-border pb-2">
        <Link
          href="/admin"
          className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          Dashboard
        </Link>
        <Link
          href="/admin/utilisateurs"
          className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          Utilisateurs
        </Link>
        <Link
          href="/admin/contenu"
          className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          Contenu
        </Link>
        <Link
          href="/admin/artistes"
          className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          Artistes
        </Link>
      </nav>

      {children}
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin-guard.ts src/app/admin/layout.tsx
git commit -m "feat: add admin guard and admin layout with navigation"
```

---

## Task 3: Admin Dashboard — Stats

**Files:**
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Create dashboard page**

```tsx
// src/app/admin/page.tsx
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Music, Users, Guitar, FileText } from "lucide-react"

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [
    { count: songCount },
    { count: artistCount },
    { count: userCount },
    { count: sheetCount },
    { count: bannedCount },
    { data: recentSongs },
  ] = await Promise.all([
    supabase.from("songs").select("*", { count: "exact", head: true }),
    supabase.from("artists").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("chord_sheets").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", true),
    supabase
      .from("songs")
      .select("id, title, created_at, profiles:created_by(username)")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  return (
    <div className="space-y-8">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Music className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="font-heading text-3xl">{songCount ?? 0}</p>
            <p className="text-sm text-muted-foreground">Chansons</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Guitar className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="font-heading text-3xl">{artistCount ?? 0}</p>
            <p className="text-sm text-muted-foreground">Artistes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="font-heading text-3xl">{userCount ?? 0}</p>
            <p className="text-sm text-muted-foreground">Utilisateurs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="font-heading text-3xl">{sheetCount ?? 0}</p>
            <p className="text-sm text-muted-foreground">Fiches accords</p>
          </CardContent>
        </Card>
      </div>

      {/* Banned count */}
      {(bannedCount ?? 0) > 0 && (
        <p className="text-sm text-destructive">
          {bannedCount} compte(s) banni(s)
        </p>
      )}

      {/* Recent activity */}
      <div>
        <h2 className="font-heading text-lg mb-3">Activite recente</h2>
        <div className="space-y-2">
          {recentSongs?.map((song) => {
            const profile = song.profiles as { username: string } | null
            return (
              <div key={song.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium">{song.title}</p>
                  <p className="text-sm text-muted-foreground">par {profile?.username ?? "inconnu"}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(song.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
            )
          })}
          {(!recentSongs || recentSongs.length === 0) && (
            <p className="text-muted-foreground">Aucune activite.</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: add admin dashboard with stats and recent activity"
```

---

## Task 4: User Management — List + Ban/Unban

**Files:**
- Create: `src/app/admin/utilisateurs/page.tsx`
- Create: `src/app/api/admin/ban-user/route.ts`

- [ ] **Step 1: Create ban API route**

```tsx
// src/app/api/admin/ban-user/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 })
  }

  const { userId, banned } = await request.json()

  if (!userId || typeof banned !== "boolean") {
    return NextResponse.json({ error: "Parametres invalides" }, { status: 400 })
  }

  // Prevent self-ban
  if (userId === user.id) {
    return NextResponse.json({ error: "Impossible de se bannir soi-meme" }, { status: 400 })
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_banned: banned })
    .eq("id", userId)

  if (error) {
    return NextResponse.json({ error: "Erreur lors de la mise a jour" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create user list page**

```tsx
// src/app/admin/utilisateurs/page.tsx
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { BanUserButton } from "./BanUserButton"

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from("profiles")
    .select("id, username, role, is_banned, created_at")
    .order("created_at", { ascending: false })

  return (
    <div>
      <h2 className="font-heading text-xl mb-4">Utilisateurs ({users?.length ?? 0})</h2>

      <div className="space-y-2">
        {users?.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-4 bg-card rounded-lg border border-border"
          >
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground">
                  Inscrit le {new Date(user.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex gap-1">
                {user.role === "admin" && (
                  <Badge variant="default">Admin</Badge>
                )}
                {user.is_banned && (
                  <Badge variant="destructive">Banni</Badge>
                )}
              </div>
            </div>

            {user.role !== "admin" && (
              <BanUserButton
                userId={user.id}
                isBanned={user.is_banned}
                username={user.username}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create BanUserButton client component**

```tsx
// src/app/admin/utilisateurs/BanUserButton.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Ban, CheckCircle } from "lucide-react"

interface BanUserButtonProps {
  userId: string
  isBanned: boolean
  username: string
}

export function BanUserButton({ userId, isBanned, username }: BanUserButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleToggleBan() {
    const action = isBanned ? "debannir" : "bannir"
    if (!confirm(`Confirmer ${action} ${username} ?`)) return

    setLoading(true)
    const res = await fetch("/api/admin/ban-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, banned: !isBanned }),
    })

    if (res.ok) {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Button
      variant={isBanned ? "outline" : "destructive"}
      size="sm"
      onClick={handleToggleBan}
      disabled={loading}
    >
      {isBanned ? (
        <>
          <CheckCircle className="w-4 h-4 mr-1" />
          Debannir
        </>
      ) : (
        <>
          <Ban className="w-4 h-4 mr-1" />
          Bannir
        </>
      )}
    </Button>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/utilisateurs/ src/app/api/admin/ban-user/
git commit -m "feat: add admin user management with ban/unban"
```

---

## Task 5: Content Management — Delete Songs/Sheets

**Files:**
- Create: `src/app/admin/contenu/page.tsx`
- Create: `src/app/admin/contenu/DeleteButton.tsx`
- Create: `src/app/api/admin/delete-content/route.ts`

- [ ] **Step 1: Create delete API route**

```tsx
// src/app/api/admin/delete-content/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 })
  }

  const { type, id } = await request.json()

  if (!type || !id) {
    return NextResponse.json({ error: "Parametres invalides" }, { status: 400 })
  }

  if (type === "song") {
    // Deleting a song cascades to chord_sheets
    const { error } = await supabase.from("songs").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (type === "chord_sheet") {
    const { error } = await supabase.from("chord_sheets").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    return NextResponse.json({ error: "Type invalide" }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create DeleteButton client component**

```tsx
// src/app/admin/contenu/DeleteButton.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

interface DeleteButtonProps {
  type: "song" | "chord_sheet"
  id: string
  label: string
}

export function DeleteButton({ type, id, label }: DeleteButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`Supprimer "${label}" ? Cette action est irreversible.`)) return

    setLoading(true)
    const res = await fetch("/api/admin/delete-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    })

    if (res.ok) {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  )
}
```

- [ ] **Step 3: Create content management page**

```tsx
// src/app/admin/contenu/page.tsx
import { createClient } from "@/lib/supabase/server"
import { DeleteButton } from "./DeleteButton"
import { Badge } from "@/components/ui/badge"
import type { Style } from "@/types/database"

export default async function AdminContentPage() {
  const supabase = await createClient()

  const { data: songs } = await supabase
    .from("songs")
    .select(`
      id, title, slug, style, status, created_at,
      artists(name),
      profiles:created_by(username),
      chord_sheets(id, instrument)
    `)
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div>
      <h2 className="font-heading text-xl mb-4">Contenu</h2>

      <div className="space-y-3">
        {songs?.map((song) => {
          const artist = song.artists as { name: string } | null
          const profile = song.profiles as { username: string } | null
          const sheets = (song.chord_sheets ?? []) as { id: string; instrument: string }[]

          return (
            <div key={song.id} className="p-4 bg-card rounded-lg border border-border">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{song.title}</p>
                    <Badge variant="secondary" className="text-xs">
                      {song.style}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {artist?.name ?? "?"} — par {profile?.username ?? "?"} — {new Date(song.created_at).toLocaleDateString("fr-FR")}
                  </p>
                  {sheets.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {sheets.map((sheet) => (
                        <div key={sheet.id} className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          <span>{sheet.instrument}</span>
                          <DeleteButton type="chord_sheet" id={sheet.id} label={`fiche ${sheet.instrument}`} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <DeleteButton type="song" id={song.id} label={song.title} />
              </div>
            </div>
          )
        })}

        {(!songs || songs.length === 0) && (
          <p className="text-muted-foreground">Aucun contenu.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/contenu/ src/app/api/admin/delete-content/
git commit -m "feat: add admin content management (delete songs/sheets)"
```

---

## Task 6: Artist Management — List + Merge Duplicates

**Files:**
- Create: `src/app/admin/artistes/page.tsx`
- Create: `src/app/admin/artistes/MergeArtists.tsx`
- Create: `src/app/api/admin/merge-artists/route.ts`

- [ ] **Step 1: Create merge API route**

```tsx
// src/app/api/admin/merge-artists/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 })
  }

  const { sourceId, targetId } = await request.json()

  if (!sourceId || !targetId || sourceId === targetId) {
    return NextResponse.json({ error: "Parametres invalides" }, { status: 400 })
  }

  const { error } = await supabase.rpc("merge_artists", {
    source_id: sourceId,
    target_id: targetId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create MergeArtists client component**

```tsx
// src/app/admin/artistes/MergeArtists.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Merge } from "lucide-react"

interface Artist {
  id: string
  name: string
  songCount: number
}

interface MergeArtistsProps {
  artists: Artist[]
}

export function MergeArtists({ artists }: MergeArtistsProps) {
  const router = useRouter()
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const sourceName = artists.find((a) => a.id === sourceId)?.name
  const targetName = artists.find((a) => a.id === targetId)?.name

  async function handleMerge() {
    if (!sourceId || !targetId) return
    if (!confirm(`Fusionner "${sourceName}" dans "${targetName}" ? Les chansons seront reassignees et "${sourceName}" sera supprime.`)) return

    setLoading(true)
    const res = await fetch("/api/admin/merge-artists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, targetId }),
    })

    if (res.ok) {
      setSourceId(null)
      setTargetId(null)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="p-4 bg-card rounded-lg border border-border space-y-3">
      <h3 className="font-medium flex items-center gap-2">
        <Merge className="w-4 h-4" />
        Fusionner deux artistes
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Artiste a supprimer</p>
          <Select value={sourceId ?? undefined} onValueChange={setSourceId}>
            <SelectTrigger>
              <SelectValue placeholder="Selectionner..." />
            </SelectTrigger>
            <SelectContent>
              {artists.filter((a) => a.id !== targetId).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} ({a.songCount} chansons)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Garder (cible)</p>
          <Select value={targetId ?? undefined} onValueChange={setTargetId}>
            <SelectTrigger>
              <SelectValue placeholder="Selectionner..." />
            </SelectTrigger>
            <SelectContent>
              {artists.filter((a) => a.id !== sourceId).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} ({a.songCount} chansons)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        onClick={handleMerge}
        disabled={!sourceId || !targetId || loading}
        variant="destructive"
        size="sm"
      >
        {loading ? "Fusion..." : "Fusionner"}
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Create artist management page**

```tsx
// src/app/admin/artistes/page.tsx
import { createClient } from "@/lib/supabase/server"
import { MergeArtists } from "./MergeArtists"
import { DeleteButton } from "../contenu/DeleteButton"

export default async function AdminArtistsPage() {
  const supabase = await createClient()

  const { data: artists } = await supabase
    .from("artists")
    .select("id, name, slug, origin, created_at, songs(count)")
    .order("name")

  const artistList = (artists ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    origin: a.origin,
    songCount: (a.songs as { count: number }[])?.[0]?.count ?? 0,
    created_at: a.created_at,
  }))

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xl">Artistes ({artistList.length})</h2>

      {/* Merge tool */}
      {artistList.length >= 2 && (
        <MergeArtists artists={artistList.map(({ id, name, songCount }) => ({ id, name, songCount }))} />
      )}

      {/* Artist list */}
      <div className="space-y-2">
        {artistList.map((artist) => (
          <div
            key={artist.id}
            className="flex items-center justify-between p-4 bg-card rounded-lg border border-border"
          >
            <div>
              <p className="font-medium">{artist.name}</p>
              <p className="text-xs text-muted-foreground">
                {artist.origin ?? "Origine inconnue"} — {artist.songCount} chanson(s) — /{artist.slug}
              </p>
            </div>
            {artist.songCount === 0 && (
              <DeleteButton type="song" id={artist.id} label={artist.name} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

Note: The DeleteButton for artists with 0 songs reuses the existing component but we need a separate delete route for artists. Let's create a dedicated API for this.

- [ ] **Step 4: Create artist delete API route**

```tsx
// src/app/api/admin/delete-artist/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 })
  }

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 })

  const { error } = await supabase.from("artists").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

Update the artist page to use a dedicated `DeleteArtistButton` component:

```tsx
// src/app/admin/artistes/DeleteArtistButton.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export function DeleteArtistButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`Supprimer l'artiste "${name}" ?`)) return
    setLoading(true)

    const res = await fetch("/api/admin/delete-artist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })

    if (res.ok) router.refresh()
    setLoading(false)
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
      <Trash2 className="w-4 h-4" />
    </Button>
  )
}
```

Then use `<DeleteArtistButton>` instead of `<DeleteButton>` in the artist page.

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/artistes/ src/app/api/admin/merge-artists/ src/app/api/admin/delete-artist/
git commit -m "feat: add admin artist management (list, merge duplicates, delete)"
```

---

## Task 7: Update Header — Admin link for admins

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Show admin link in header when user is admin**

Read `src/components/Header.tsx`. The header already tracks auth state. Add a check for admin role. After `supabase.auth.getUser()`, also fetch the profile to check role:

1. Add state: `const [isAdmin, setIsAdmin] = useState(false)`
2. In the useEffect, after getting user, fetch profile:
```tsx
if (user) {
  supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
    .then(({ data }) => {
      if (data?.role === "admin") setIsAdmin(true)
    })
}
```
3. In the desktop nav, after the Contribuer button but before the user/connexion section, add:
```tsx
{isAdmin && (
  <Link
    href="/admin"
    className={buttonVariants({ variant: "ghost", size: "sm" })}
  >
    <Shield className="w-4 h-4 mr-1" />
    Admin
  </Link>
)}
```
4. Import `Shield` from lucide-react.
5. Also add admin link in MobileMenu if user is admin.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.tsx src/components/MobileMenu.tsx
git commit -m "feat: show admin link in header for admin users"
```

---

## Task 8: Block banned users from contributing

**Files:**
- Modify: `src/app/contribuer/page.tsx`

- [ ] **Step 1: Check ban status before submit**

In `handleSubmit`, after the auth check (`if (!user)`) and before the Turnstile/rate-limit checks, add:

```tsx
// Check if user is banned
const { data: userProfile } = await supabase
  .from("profiles")
  .select("is_banned")
  .eq("id", user.id)
  .single()

if (userProfile?.is_banned) {
  setError("Ton compte a ete suspendu. Tu ne peux plus contribuer.")
  setLoading(false)
  return
}
```

This is a client-side check for UX. The RLS policy (from Task 1) already blocks inserts at DB level for banned users.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/contribuer/page.tsx
git commit -m "feat: block banned users from contributing (client-side + RLS)"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | DB migration: role, is_banned, admin RLS, merge RPC | `005_admin.sql`, `database.ts` |
| 2 | Admin guard + layout with tabs | `admin-guard.ts`, `admin/layout.tsx` |
| 3 | Dashboard stats | `admin/page.tsx` |
| 4 | User management: list + ban/unban | `admin/utilisateurs/`, `api/admin/ban-user/` |
| 5 | Content management: delete songs/sheets | `admin/contenu/`, `api/admin/delete-content/` |
| 6 | Artist management: list + merge + delete | `admin/artistes/`, `api/admin/merge-artists/`, `api/admin/delete-artist/` |
| 7 | Admin link in header | `Header.tsx`, `MobileMenu.tsx` |
| 8 | Block banned users | `contribuer/page.tsx` |
