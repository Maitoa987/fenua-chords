# User & Admin UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the authenticated user experience — profile, contributions dashboard, edit buttons, user dropdown, redirect post-login, and server-side auth guards.

**Architecture:** Add `first_name`/`last_name` to profiles. Create user dropdown in Header (shadcn DropdownMenu or custom). Add /profil and /mes-contributions pages. Show edit button on song detail for owners. Protect /contribuer with server-side layout guard. Preserve `next` param through auth flow.

**Tech Stack:** Next.js 16, Supabase, shadcn/ui, Tailwind CSS v4, lucide-react.

---

## File Structure

```
supabase/
  migrations/
    006_profile_names.sql               # first_name, last_name columns

src/
  app/
    profil/
      page.tsx                          # Profile page (view/edit)
    mes-contributions/
      page.tsx                          # User's songs and sheets
      DeleteMySheetButton.tsx           # Delete own chord sheet
    contribuer/
      layout.tsx                        # Server guard (requireAuth)
    connexion/
      page.tsx                          # Add next param + username field
    chansons/
      [slug]/
        SongDetailClient.tsx            # Add edit button for owner
  components/
    Header.tsx                          # User dropdown menu
    MobileMenu.tsx                      # User links in mobile
    UserMenu.tsx                        # Dropdown component
  types/
    database.ts                         # Update Profile type
```

---

## Task 1: DB Migration — first_name, last_name

**Files:**
- Create: `supabase/migrations/006_profile_names.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/006_profile_names.sql
alter table profiles add column if not exists first_name text;
alter table profiles add column if not exists last_name text;
```

- [ ] **Step 2: Update TypeScript types**

In `src/types/database.ts`, add to Profile interface (after `bio`):

```typescript
  first_name: string | null
  last_name: string | null
```

- [ ] **Step 3: Run migration in Supabase SQL Editor**

User action: run `006_profile_names.sql`. Then update the existing profile:

```sql
update profiles set first_name = 'Maitoa', last_name = 'Vahapata', username = 'Maitoa', role = 'admin'
where id = (select id from auth.users where email = 'maitoav@gmail.com');
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/006_profile_names.sql src/types/database.ts
git commit -m "feat: add first_name, last_name to profiles"
```

---

## Task 2: Username field on signup

**Files:**
- Modify: `src/app/connexion/page.tsx`

- [ ] **Step 1: Add username state and field**

Read `src/app/connexion/page.tsx`. Changes:

1. Add state: `const [username, setUsername] = useState("")`
2. In signup mode, add a username input field BEFORE the email field:

```tsx
{mode === "signup" && (
  <div className="space-y-1">
    <Label htmlFor="username">Nom d&apos;utilisateur</Label>
    <Input
      id="username"
      type="text"
      placeholder="Ton pseudo"
      value={username}
      onChange={(e) => setUsername(e.target.value)}
      required
      minLength={2}
      maxLength={30}
    />
  </div>
)}
```

3. In the signup handler, pass username as user metadata:

```tsx
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/callback`,
    data: { username },
  },
})
```

The existing trigger `handle_new_user` already reads `raw_user_meta_data->>'username'` — so this will set the username correctly on signup.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/connexion/page.tsx
git commit -m "feat: add username field on signup form"
```

---

## Task 3: User dropdown menu in Header

**Files:**
- Create: `src/components/UserMenu.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/MobileMenu.tsx`

- [ ] **Step 1: Create UserMenu component**

```tsx
// src/components/UserMenu.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { User, LogOut, FileText, Settings, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UserMenuProps {
  username: string
  isAdmin: boolean
  onLogout: () => void
}

export function UserMenu({ username, isAdmin, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2"
      >
        <User className="w-4 h-4" />
        <span className="hidden sm:inline text-sm">{username}</span>
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg border border-border shadow-lg py-1 z-50">
          <div className="px-3 py-2 border-b border-border">
            <p className="font-medium text-sm">{username}</p>
          </div>

          <Link
            href="/profil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <Settings className="w-4 h-4" />
            Mon profil
          </Link>

          <Link
            href="/mes-contributions"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <FileText className="w-4 h-4" />
            Mes contributions
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Shield className="w-4 h-4" />
              Administration
            </Link>
          )}

          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => { onLogout(); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors w-full text-left text-destructive cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Deconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update Header to use UserMenu**

Read `src/components/Header.tsx`. Replace the current logged-in section (User icon + LogOut button) with the UserMenu component.

Changes:
1. Import `UserMenu`
2. Add username state: `const [username, setUsername] = useState("")`
3. In useEffect, when fetching profile for role, also fetch username:
```tsx
supabase.from("profiles").select("role, username").eq("id", user.id).single()
  .then(({ data }) => {
    if (data?.role === "admin") setIsAdmin(true)
    if (data?.username) setUsername(data.username)
  })
```
4. Replace the logged-in desktop UI with:
```tsx
{user ? (
  <UserMenu username={username} isAdmin={isAdmin} onLogout={handleLogout} />
) : (
  <Link href="/connexion" className={buttonVariants({ variant: "ghost" })}>
    Connexion
  </Link>
)}
```
5. Remove the old admin link (now inside UserMenu)

- [ ] **Step 3: Update MobileMenu**

Read `src/components/MobileMenu.tsx`. For logged-in users, add links to profil and mes-contributions:

```tsx
{user && (
  <>
    <Link href="/profil" onClick={onClose} className={...}>Mon profil</Link>
    <Link href="/mes-contributions" onClick={onClose} className={...}>Mes contributions</Link>
    {isAdmin && <Link href="/admin" onClick={onClose} className={...}>Administration</Link>}
  </>
)}
```

Pass `username` prop to MobileMenu and show it at the top.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/UserMenu.tsx src/components/Header.tsx src/components/MobileMenu.tsx
git commit -m "feat: add user dropdown menu with profile, contributions, admin links"
```

---

## Task 4: Profile page

**Files:**
- Create: `src/app/profil/page.tsx`

- [ ] **Step 1: Create profile page**

Server component that fetches the user's profile, renders a form to edit username/first_name/last_name. Uses a client sub-component for the form.

```tsx
// src/app/profil/page.tsx
import { requireAuth } from "@/lib/auth-guard"
import { createClient } from "@/lib/supabase/server"
import { ProfileForm } from "./ProfileForm"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mon profil — Fenua Chords",
}

export default async function ProfilPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, first_name, last_name, bio, created_at")
    .eq("id", user.id)
    .single()

  return (
    <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <h1 className="font-heading text-2xl text-primary">Mon profil</h1>

      <div className="text-sm text-muted-foreground">
        Email : {user.email}
      </div>

      <ProfileForm
        initialData={{
          username: profile?.username ?? "",
          firstName: profile?.first_name ?? "",
          lastName: profile?.last_name ?? "",
          bio: profile?.bio ?? "",
        }}
      />

      <p className="text-xs text-muted-foreground">
        Membre depuis le {new Date(profile?.created_at ?? "").toLocaleDateString("fr-FR")}
      </p>
    </main>
  )
}
```

- [ ] **Step 2: Create ProfileForm client component**

```tsx
// src/app/profil/ProfileForm.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ProfileFormProps {
  initialData: {
    username: string
    firstName: string
    lastName: string
    bio: string
  }
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: data.username.trim(),
        first_name: data.firstName.trim() || null,
        last_name: data.lastName.trim() || null,
        bio: data.bio.trim() || null,
      })
      .eq("id", user.id)

    if (updateError) {
      setError("Erreur lors de la sauvegarde.")
    } else {
      setSuccess(true)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="username">Nom d&apos;utilisateur <span className="text-destructive">*</span></Label>
        <Input
          id="username"
          value={data.username}
          onChange={(e) => setData({ ...data, username: e.target.value })}
          required
          minLength={2}
          maxLength={30}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="firstName">Prenom</Label>
          <Input
            id="firstName"
            value={data.firstName}
            onChange={(e) => setData({ ...data, firstName: e.target.value })}
            maxLength={50}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            value={data.lastName}
            onChange={(e) => setData({ ...data, lastName: e.target.value })}
            maxLength={50}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={data.bio}
          onChange={(e) => setData({ ...data, bio: e.target.value })}
          rows={3}
          maxLength={500}
          placeholder="Parle-nous de toi..."
        />
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert><AlertDescription>Profil mis a jour !</AlertDescription></Alert>}

      <Button type="submit" disabled={loading || !data.username.trim()}>
        {loading ? "Sauvegarde..." : "Sauvegarder"}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/profil/
git commit -m "feat: add profile page (view/edit username, name, bio)"
```

---

## Task 5: Mes Contributions page

**Files:**
- Create: `src/app/mes-contributions/page.tsx`
- Create: `src/app/mes-contributions/DeleteMySheetButton.tsx`

- [ ] **Step 1: Create the page**

Server component that uses `requireAuth()`, fetches user's songs and chord sheets, displays them in a list with edit/delete actions.

```tsx
// src/app/mes-contributions/page.tsx
import { requireAuth } from "@/lib/auth-guard"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Edit, Music } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { DeleteMySheetButton } from "./DeleteMySheetButton"
import type { Metadata } from "next"
import type { Style } from "@/types/database"

export const metadata: Metadata = {
  title: "Mes contributions — Fenua Chords",
}

export default async function MesContributionsPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: songs } = await supabase
    .from("songs")
    .select(`
      id, title, slug, style, status, created_at,
      artists(name),
      chord_sheets(id, instrument, contributed_by)
    `)
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })

  // Also get chord sheets contributed to OTHER people's songs
  const { data: otherSheets } = await supabase
    .from("chord_sheets")
    .select(`
      id, instrument, created_at,
      songs(id, title, slug, artists(name))
    `)
    .eq("contributed_by", user.id)

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-primary">Mes contributions</h1>
        <Link
          href="/contribuer"
          className={buttonVariants({ variant: "default", className: "bg-accent hover:bg-accent/90 text-white" })}
        >
          Contribuer
        </Link>
      </div>

      {/* Songs created by user */}
      <section>
        <h2 className="font-heading text-lg mb-3">Mes chansons ({songs?.length ?? 0})</h2>
        {!songs || songs.length === 0 ? (
          <p className="text-muted-foreground">Tu n&apos;as pas encore ajoute de chanson.</p>
        ) : (
          <div className="space-y-2">
            {songs.map((song) => {
              const artist = song.artists as { name: string } | null
              const sheets = (song.chord_sheets ?? []) as { id: string; instrument: string; contributed_by: string }[]

              return (
                <div key={song.id} className="p-4 bg-card rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link href={`/chansons/${song.slug}`} className="font-medium hover:text-primary transition-colors">
                        {song.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">{artist?.name ?? "?"}</p>
                    </div>
                    <Badge variant="secondary">{song.style}</Badge>
                  </div>
                  {sheets.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sheets.filter(s => s.contributed_by === user.id).map((sheet) => (
                        <div key={sheet.id} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                          <Music className="w-3 h-3" />
                          <span>{sheet.instrument}</span>
                          <Link href={`/contribuer/${sheet.id}/edit`} className="text-primary hover:underline ml-1">
                            <Edit className="w-3 h-3" />
                          </Link>
                          <DeleteMySheetButton sheetId={sheet.id} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Create DeleteMySheetButton**

```tsx
// src/app/mes-contributions/DeleteMySheetButton.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

export function DeleteMySheetButton({ sheetId }: { sheetId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm("Supprimer cette fiche d'accords ?")) return
    setLoading(true)

    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()

    await supabase.from("chord_sheets").delete().eq("id", sheetId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-destructive hover:text-destructive/80 cursor-pointer ml-1"
      aria-label="Supprimer"
    >
      <Trash2 className="w-3 h-3" />
    </button>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/mes-contributions/
git commit -m "feat: add my contributions page with edit/delete actions"
```

---

## Task 6: Edit button on song detail page

**Files:**
- Modify: `src/app/chansons/[slug]/SongDetailClient.tsx`

- [ ] **Step 1: Add auth awareness and edit button**

Read `src/app/chansons/[slug]/SongDetailClient.tsx`. Changes:

1. Add `currentUserId` prop to the component interface
2. The parent page (`page.tsx`) passes the current user ID (or null if not logged in):
   - Read `src/app/chansons/[slug]/page.tsx`
   - Import `createClient`, get user with `supabase.auth.getUser()`
   - Pass `currentUserId={user?.id ?? null}` to SongDetailClient

3. In SongDetailClient, for each chord sheet, check if `sheet.contributed_by === currentUserId`
4. If owner, show an edit link:

```tsx
{currentUserId && sheet.contributed_by === currentUserId && (
  <Link
    href={`/contribuer/${sheet.id}/edit`}
    className="text-sm text-primary hover:underline flex items-center gap-1"
  >
    <Edit className="w-3.5 h-3.5" />
    Modifier
  </Link>
)}
```

Add this in the sheet metadata row, next to the contributor username.

Also import `Link` from `next/link` and `Edit` from `lucide-react`.

**Important:** The `contributed_by` field must be included in the chord_sheets data passed to SongDetailClient. Check if it's already there — if not, add it to the Supabase query in page.tsx.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/chansons/\[slug\]/page.tsx src/app/chansons/\[slug\]/SongDetailClient.tsx
git commit -m "feat: show edit button on chord sheets for contributors"
```

---

## Task 7: Post-login redirect (next param)

**Files:**
- Modify: `src/app/connexion/page.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/lib/auth-guard.ts`

- [ ] **Step 1: Read `next` param in login page**

In `src/app/connexion/page.tsx`:
1. Get the `next` search param from the URL:
```tsx
import { useSearchParams } from "next/navigation"
// Inside component:
const searchParams = useSearchParams()
const nextUrl = searchParams.get("next") ?? "/"
```

2. After successful login, redirect to nextUrl instead of "/":
```tsx
router.push(nextUrl)
```

3. Include `next` in the emailRedirectTo for signup and magic link:
```tsx
emailRedirectTo: `${window.location.origin}/callback?next=${encodeURIComponent(nextUrl)}`,
```

- [ ] **Step 2: Update auth-guard to pass next param**

In `src/lib/auth-guard.ts`, update the redirect to include the current path:

```tsx
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const headersList = await headers()
    const pathname = headersList.get("x-next-pathname") ?? "/"
    redirect(`/connexion?next=${encodeURIComponent(pathname)}`)
  }

  return user
}
```

Note: The `x-next-pathname` header may not be available. Alternative: pass the path from the page/layout that calls requireAuth. A simpler approach is to just redirect to `/connexion` and let the user navigate back manually — the `next` param is a nice-to-have, not critical. Use the simpler approach if the header isn't available.

- [ ] **Step 3: Update callback route**

Read `src/app/callback/route.ts`. It already reads `next` from searchParams — verify it passes it through correctly.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/connexion/page.tsx src/lib/auth-guard.ts src/app/callback/route.ts
git commit -m "feat: preserve redirect URL through auth flow (next param)"
```

---

## Task 8: Server guard on /contribuer

**Files:**
- Create: `src/app/contribuer/layout.tsx`

- [ ] **Step 1: Create layout with auth guard**

```tsx
// src/app/contribuer/layout.tsx
import { requireAuth } from "@/lib/auth-guard"

export default async function ContribuerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth()
  return <>{children}</>
}
```

This ensures the user is authenticated BEFORE the page renders. The client-side check in page.tsx can stay as a fallback but won't be needed.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/contribuer/layout.tsx
git commit -m "feat: protect /contribuer with server-side auth guard"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | DB: first_name, last_name + seed admin | `006_profile_names.sql`, `database.ts` |
| 2 | Username field on signup | `connexion/page.tsx` |
| 3 | User dropdown menu | `UserMenu.tsx`, `Header.tsx`, `MobileMenu.tsx` |
| 4 | Profile page (view/edit) | `profil/page.tsx`, `ProfileForm.tsx` |
| 5 | Mes contributions page | `mes-contributions/page.tsx`, `DeleteMySheetButton.tsx` |
| 6 | Edit button on song detail | `SongDetailClient.tsx`, `chansons/[slug]/page.tsx` |
| 7 | Post-login redirect (next param) | `connexion/page.tsx`, `auth-guard.ts`, `callback/route.ts` |
| 8 | Server guard on /contribuer | `contribuer/layout.tsx` |
