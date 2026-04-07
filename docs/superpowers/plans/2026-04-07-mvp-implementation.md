# Fenua Chords MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a community platform for sharing Polynesian song chords — from zero to deployed MVP.

**Architecture:** Next.js 16 App Router with Supabase (Postgres + Auth + RLS). Server-side rendering for SEO on public pages, client components for interactive features (chord editor, transposition). ChordPro format as the single source of truth for chord content.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Supabase (@supabase/ssr), Tailwind CSS v4, Lucide Icons, Vercel deploy.

**Specs:** `docs/superpowers/specs/2026-04-07-mvp-roadmap-design.md`, `docs/spec-chord-editor.md`

**Note:** The user will create the Supabase project manually. Task 1 provides the SQL migrations to run in the Supabase SQL editor.

---

## File Structure

```
src/
  app/
    layout.tsx                          # Root layout (fonts, design system)
    globals.css                         # Tailwind + custom properties
    page.tsx                            # Landing page
    not-found.tsx                       # 404 page
    error.tsx                           # 500 page
    artistes/
      page.tsx                          # Artist list (SSR)
      loading.tsx                       # Loading skeleton
      [slug]/
        page.tsx                        # Artist detail + songs (SSR)
    chansons/
      page.tsx                          # Song list + search (SSR)
      loading.tsx                       # Loading skeleton
      [slug]/
        page.tsx                        # Song detail + chords (ISR)
        SongDetailClient.tsx            # Client interactivity (transpose, sheet select)
    contribuer/
      page.tsx                          # New song + chord editor (auth)
      [id]/
        edit/
          page.tsx                      # Edit chord sheet (auth, owner only)
    connexion/
      page.tsx                          # Login page
    callback/
      route.ts                         # Auth callback handler
    sitemap.ts                          # Dynamic sitemap
  components/
    Header.tsx                          # Nav + CTA + auth state
    Footer.tsx                          # Simple footer
    MobileMenu.tsx                      # Hamburger menu (mobile)
    SongCard.tsx                        # Song card for lists
    ArtistCard.tsx                      # Artist card for lists
    StyleBadge.tsx                      # Colored badge per music style
    SearchBar.tsx                       # Search input with dropdown results
    ChordRenderer.tsx                   # Public page chord display
    TransposeControls.tsx               # Transpose UI (arrows + key display)
    SongForm.tsx                        # Song metadata form (title, artist, style...)
    chord-editor/
      ChordEditor.tsx                   # Container: mode toggle + state
      TapToChord.tsx                    # Visual mode: lyrics + tap to place
      ChordProTextarea.tsx              # Text mode: textarea + live preview
      ChordPicker.tsx                   # Bottom-sheet chord grid
      ChordPreview.tsx                  # Read-only chord render (reused)
  lib/
    supabase/
      client.ts                         # Browser client (exists)
      server.ts                         # Server client (exists)
      middleware.ts                     # Session refresh (exists)
    chordpro.ts                         # Parse/serialize ChordPro format
    transpose.ts                        # Chord transposition logic
    slugify.ts                          # Generate URL slugs
    auth-guard.ts                       # Server-side auth check helper
  types/
    database.ts                         # DB types (exists, will update)
supabase/
  migrations/
    001_schema.sql                      # Tables + enums + triggers
    002_rls.sql                         # RLS policies
    003_seed.sql                        # Seed data (5-10 songs)
```

---

## Etape 1 — Fondations

### Task 1: Database Migrations

**Files:**
- Create: `supabase/migrations/001_schema.sql`
- Create: `supabase/migrations/002_rls.sql`
- Create: `supabase/migrations/003_seed.sql`

- [ ] **Step 1: Write schema migration**

```sql
-- supabase/migrations/001_schema.sql

-- Enums
create type style as enum ('bringue', 'himene', 'variete', 'traditionnel', 'autre');
create type instrument as enum ('guitare', 'ukulele', 'basse', 'ukulele-bass');
create type song_status as enum ('draft', 'published');

-- Profiles (auto-created on signup)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null
);

-- Artists
create table artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  origin text,
  bio text,
  created_at timestamptz default now() not null
);

-- Songs
create table songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  artist_id uuid references artists(id) on delete cascade not null,
  style style not null default 'autre',
  language text,
  original_key text,
  bpm smallint,
  youtube_url text,
  created_by uuid references profiles(id) not null,
  status song_status not null default 'published',
  created_at timestamptz default now() not null
);

-- Chord sheets
create table chord_sheets (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references songs(id) on delete cascade not null,
  instrument instrument not null default 'guitare',
  tuning text,
  capo smallint default 0,
  content text not null,
  contributed_by uuid references profiles(id) not null,
  votes_up integer default 0 not null,
  votes_down integer default 0 not null,
  is_official boolean default false not null,
  created_at timestamptz default now() not null
);

-- Indexes
create index idx_songs_artist on songs(artist_id);
create index idx_songs_slug on songs(slug);
create index idx_artists_slug on artists(slug);
create index idx_chord_sheets_song on chord_sheets(song_id);
create index idx_songs_style on songs(style);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Write RLS policies**

```sql
-- supabase/migrations/002_rls.sql

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table artists enable row level security;
alter table songs enable row level security;
alter table chord_sheets enable row level security;

-- Profiles
create policy "Profiles are viewable by everyone"
  on profiles for select using (true);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Artists
create policy "Artists are viewable by everyone"
  on artists for select using (true);
create policy "Authenticated users can create artists"
  on artists for insert with check (auth.role() = 'authenticated');

-- Songs
create policy "Published songs are viewable by everyone"
  on songs for select using (status = 'published');
create policy "Authenticated users can create songs"
  on songs for insert with check (auth.role() = 'authenticated');
create policy "Users can update own songs"
  on songs for update using (auth.uid() = created_by);
create policy "Users can delete own songs"
  on songs for delete using (auth.uid() = created_by);

-- Chord sheets
create policy "Chord sheets are viewable by everyone"
  on chord_sheets for select using (true);
create policy "Authenticated users can create chord sheets"
  on chord_sheets for insert with check (auth.role() = 'authenticated');
create policy "Users can update own chord sheets"
  on chord_sheets for update using (auth.uid() = contributed_by);
create policy "Users can delete own chord sheets"
  on chord_sheets for delete using (auth.uid() = contributed_by);
```

- [ ] **Step 3: Write seed data**

```sql
-- supabase/migrations/003_seed.sql

-- Artists
insert into artists (id, name, slug, origin) values
  ('a1000000-0000-0000-0000-000000000001', 'Bobby Holcomb', 'bobby-holcomb', 'Tahiti'),
  ('a1000000-0000-0000-0000-000000000002', 'Angelo', 'angelo', 'Tahiti'),
  ('a1000000-0000-0000-0000-000000000003', 'Sabrina', 'sabrina', 'Tahiti'),
  ('a1000000-0000-0000-0000-000000000004', 'Te Ava Piti', 'te-ava-piti', 'Moorea'),
  ('a1000000-0000-0000-0000-000000000005', 'Coco Hotahota', 'coco-hotahota', 'Tahiti');

-- Note: songs and chord_sheets require a valid profile ID (created_by / contributed_by).
-- After your first signup, get your user ID from Supabase Auth dashboard,
-- then run these inserts replacing <YOUR_USER_ID> with your actual UUID:

-- INSERT INTO songs (title, slug, artist_id, style, original_key, created_by, status) VALUES
--   ('Purotu', 'purotu', 'a1000000-0000-0000-0000-000000000001', 'bringue', 'Am', '<YOUR_USER_ID>', 'published'),
--   ('My Bobby', 'my-bobby', 'a1000000-0000-0000-0000-000000000001', 'variete', 'C', '<YOUR_USER_ID>', 'published');

-- INSERT INTO chord_sheets (song_id, instrument, content, contributed_by) VALUES
--   ('<SONG_ID>', 'guitare', '[Am]Ia ora na [G]te here [C]nei
-- [F]Tatou e [G]haere [Am]mai', '<YOUR_USER_ID>');
```

- [ ] **Step 4: Run migrations in Supabase SQL editor**

User action: go to Supabase Dashboard > SQL Editor, run `001_schema.sql` then `002_rls.sql`. Run `003_seed.sql` after first signup (to have a valid profile ID).

- [ ] **Step 5: Create `.env.local` file**

Create `.env.local` at project root (not committed):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 6: Commit**

```bash
git add supabase/
git commit -m "feat: add database migrations (schema, RLS, seed)"
```

---

### Task 2: Design System — Fonts + Palette + Globals

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `package.json` (install lucide-react)

- [ ] **Step 1: Install Lucide Icons**

```bash
npm install lucide-react
```

- [ ] **Step 2: Update `globals.css` with design system**

Replace entire content of `src/app/globals.css`:

```css
@import "tailwindcss";

:root {
  --color-primary: #0D9488;
  --color-secondary: #14B8A6;
  --color-cta: #F97316;
  --color-bg: #F0FDFA;
  --color-surface: #FFFFFF;
  --color-text: #134E4A;
  --color-text-muted: #475569;
  --color-chord: #F97316;
}

@theme inline {
  --color-primary: var(--color-primary);
  --color-secondary: var(--color-secondary);
  --color-cta: var(--color-cta);
  --color-bg: var(--color-bg);
  --color-surface: var(--color-surface);
  --color-text: var(--color-text);
  --color-text-muted: var(--color-text-muted);
  --color-chord: var(--color-chord);
  --font-heading: 'Varela Round', sans-serif;
  --font-body: 'Nunito Sans', sans-serif;
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
}

/* Focus ring global */
*:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 3: Update `layout.tsx` with fonts**

Replace entire content of `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Varela_Round, Nunito_Sans } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const varelaRound = Varela_Round({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-varela-round",
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Fenua Chords — Accords de chants polynesiens",
  description:
    "Partagez et trouvez les accords de bringues, himene et chants polynesiens.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${varelaRound.variable} ${nunitoSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx package.json package-lock.json
git commit -m "feat: setup design system (fonts, palette, globals)"
```

---

### Task 3: Header + Footer + Layout Shell

**Files:**
- Create: `src/components/Header.tsx`
- Create: `src/components/Footer.tsx`
- Create: `src/components/MobileMenu.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create Header component**

```tsx
// src/components/Header.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Music } from "lucide-react";
import { MobileMenu } from "./MobileMenu";

const navLinks = [
  { href: "/artistes", label: "Artistes" },
  { href: "/chansons", label: "Chansons" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-primary/10">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-heading text-xl text-primary">
          <Music className="w-6 h-6" />
          Fenua Chords
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-text-muted hover:text-primary transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contribuer"
            className="bg-cta text-white px-4 py-2 rounded-lg font-semibold hover:bg-cta/90 transition-colors duration-200 cursor-pointer"
          >
            Contribuer
          </Link>
          <Link
            href="/connexion"
            className="text-text-muted hover:text-primary transition-colors duration-200"
          >
            Connexion
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 cursor-pointer"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
    </header>
  );
}
```

- [ ] **Step 2: Create MobileMenu component**

```tsx
// src/components/MobileMenu.tsx
import Link from "next/link";

interface MobileMenuProps {
  onClose: () => void;
}

export function MobileMenu({ onClose }: MobileMenuProps) {
  return (
    <nav className="md:hidden border-t border-primary/10 bg-surface p-4 space-y-3">
      <Link
        href="/artistes"
        onClick={onClose}
        className="block py-2 text-text-muted hover:text-primary transition-colors duration-200"
      >
        Artistes
      </Link>
      <Link
        href="/chansons"
        onClick={onClose}
        className="block py-2 text-text-muted hover:text-primary transition-colors duration-200"
      >
        Chansons
      </Link>
      <Link
        href="/contribuer"
        onClick={onClose}
        className="block py-2 bg-cta text-white text-center rounded-lg font-semibold cursor-pointer"
      >
        Contribuer
      </Link>
      <Link
        href="/connexion"
        onClick={onClose}
        className="block py-2 text-text-muted hover:text-primary transition-colors duration-200"
      >
        Connexion
      </Link>
    </nav>
  );
}
```

- [ ] **Step 3: Create Footer component**

```tsx
// src/components/Footer.tsx
export function Footer() {
  return (
    <footer className="border-t border-primary/10 bg-surface/50 py-6 mt-auto">
      <div className="max-w-6xl mx-auto px-4 text-center text-sm text-text-muted">
        Fenua Chords &copy; {new Date().getFullYear()}
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Update layout.tsx to include Header + Footer**

Add imports and wrap children in `src/app/layout.tsx`:

```tsx
// Add at top of layout.tsx, after existing imports:
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Replace <body> content:
<body className="min-h-full flex flex-col">
  <Header />
  <main className="flex-1">{children}</main>
  <Footer />
</body>
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/Header.tsx src/components/Footer.tsx src/components/MobileMenu.tsx src/app/layout.tsx
git commit -m "feat: add Header, Footer, MobileMenu layout shell"
```

---

### Task 4: Auth — Login Page + Callback

**Files:**
- Create: `src/app/connexion/page.tsx`
- Create: `src/app/callback/route.ts`
- Modify: `src/components/Header.tsx` (auth state)
- Create: `src/lib/auth-guard.ts`

- [ ] **Step 1: Create login page**

```tsx
// src/app/connexion/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Mail, Lock, ArrowLeft } from "lucide-react";

type Mode = "login" | "signup" | "magic-link";

export default function ConnexionPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleEmailPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/callback` },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Verifie tes emails pour confirmer ton compte.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        window.location.href = "/";
      }
    }
    setLoading(false);
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/callback` },
    });
    if (error) {
      setError(error.message);
    } else {
      setMessage("Lien de connexion envoye ! Verifie tes emails.");
    }
    setLoading(false);
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-heading text-2xl text-primary">
            {mode === "signup" ? "Creer un compte" : "Connexion"}
          </h1>
          <p className="text-text-muted mt-1">
            {mode === "magic-link"
              ? "Recois un lien de connexion par email"
              : mode === "signup"
                ? "Rejoins la communaute Fenua Chords"
                : "Content de te revoir !"}
          </p>
        </div>

        <form
          onSubmit={mode === "magic-link" ? handleMagicLink : handleEmailPassword}
          className="space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-primary/20 bg-surface focus:border-primary text-base"
              />
            </div>
          </div>

          {mode !== "magic-link" && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-primary/20 bg-surface focus:border-primary text-base"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>
          )}
          {message && (
            <p className="text-primary text-sm bg-bg p-2 rounded">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 cursor-pointer"
          >
            {loading
              ? "..."
              : mode === "magic-link"
                ? "Envoyer le lien"
                : mode === "signup"
                  ? "Creer mon compte"
                  : "Se connecter"}
          </button>
        </form>

        <div className="text-center space-y-2 text-sm">
          {mode === "login" && (
            <>
              <button
                onClick={() => setMode("magic-link")}
                className="text-primary hover:underline cursor-pointer"
              >
                Connexion par lien magique
              </button>
              <p className="text-text-muted">
                Pas encore de compte ?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="text-primary hover:underline cursor-pointer"
                >
                  Creer un compte
                </button>
              </p>
            </>
          )}
          {mode === "signup" && (
            <p className="text-text-muted">
              Deja un compte ?{" "}
              <button
                onClick={() => setMode("login")}
                className="text-primary hover:underline cursor-pointer"
              >
                Se connecter
              </button>
            </p>
          )}
          {mode === "magic-link" && (
            <button
              onClick={() => setMode("login")}
              className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Retour
            </button>
          )}
        </div>

        <div className="text-center">
          <Link href="/" className="text-text-muted text-sm hover:text-primary">
            Retour a l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create auth callback route**

```tsx
// src/app/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/connexion?error=auth`);
}
```

- [ ] **Step 3: Create auth guard helper**

```tsx
// src/lib/auth-guard.ts
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  return user;
}
```

- [ ] **Step 4: Update Header with auth state**

Replace the Header component to show user state. The key change: use Supabase `onAuthStateChange` to track login status, and show avatar/logout instead of "Connexion" when logged in.

```tsx
// src/components/Header.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Music, LogOut, User } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const navLinks = [
  { href: "/artistes", label: "Artistes" },
  { href: "/chansons", label: "Chansons" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-primary/10">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-heading text-xl text-primary">
          <Music className="w-6 h-6" />
          Fenua Chords
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-text-muted hover:text-primary transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contribuer"
            className="bg-cta text-white px-4 py-2 rounded-lg font-semibold hover:bg-cta/90 transition-colors duration-200 cursor-pointer"
          >
            Contribuer
          </Link>
          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-text-muted hover:text-primary transition-colors duration-200 cursor-pointer"
            >
              <User className="w-4 h-4" />
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/connexion"
              className="text-text-muted hover:text-primary transition-colors duration-200"
            >
              Connexion
            </Link>
          )}
        </nav>

        <button
          className="md:hidden p-2 cursor-pointer"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} user={user} onLogout={handleLogout} />}
    </header>
  );
}
```

Update MobileMenu to accept user/logout props:

```tsx
// src/components/MobileMenu.tsx
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

interface MobileMenuProps {
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
}

export function MobileMenu({ onClose, user, onLogout }: MobileMenuProps) {
  return (
    <nav className="md:hidden border-t border-primary/10 bg-surface p-4 space-y-3">
      <Link href="/artistes" onClick={onClose} className="block py-2 text-text-muted hover:text-primary transition-colors duration-200">
        Artistes
      </Link>
      <Link href="/chansons" onClick={onClose} className="block py-2 text-text-muted hover:text-primary transition-colors duration-200">
        Chansons
      </Link>
      <Link href="/contribuer" onClick={onClose} className="block py-2 bg-cta text-white text-center rounded-lg font-semibold cursor-pointer">
        Contribuer
      </Link>
      {user ? (
        <button
          onClick={() => { onLogout(); onClose(); }}
          className="block w-full py-2 text-left text-text-muted hover:text-primary transition-colors duration-200 cursor-pointer"
        >
          Deconnexion
        </button>
      ) : (
        <Link href="/connexion" onClick={onClose} className="block py-2 text-text-muted hover:text-primary transition-colors duration-200">
          Connexion
        </Link>
      )}
    </nav>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/app/connexion/ src/app/callback/ src/lib/auth-guard.ts src/components/Header.tsx src/components/MobileMenu.tsx
git commit -m "feat: add auth (login page, callback, auth guard, header state)"
```

---

## Etape 2 — Browse & Decouverte

### Task 5: Utility — Slugify + StyleBadge

**Files:**
- Create: `src/lib/slugify.ts`
- Create: `src/components/StyleBadge.tsx`

- [ ] **Step 1: Create slugify utility**

```tsx
// src/lib/slugify.ts
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
```

- [ ] **Step 2: Create StyleBadge component**

```tsx
// src/components/StyleBadge.tsx
import type { Style } from "@/types/database";

const styleColors: Record<Style, string> = {
  bringue: "bg-cta/15 text-cta",
  himene: "bg-primary/15 text-primary",
  variete: "bg-purple-100 text-purple-700",
  traditionnel: "bg-amber-100 text-amber-700",
  autre: "bg-gray-100 text-gray-600",
};

const styleLabels: Record<Style, string> = {
  bringue: "Bringue",
  himene: "Himene",
  variete: "Variete",
  traditionnel: "Traditionnel",
  autre: "Autre",
};

interface StyleBadgeProps {
  style: Style;
}

export function StyleBadge({ style }: StyleBadgeProps) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${styleColors[style]}`}
    >
      {styleLabels[style]}
    </span>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/slugify.ts src/components/StyleBadge.tsx
git commit -m "feat: add slugify utility and StyleBadge component"
```

---

### Task 6: Artist List + Artist Detail Pages

**Files:**
- Create: `src/components/ArtistCard.tsx`
- Create: `src/app/artistes/page.tsx`
- Create: `src/app/artistes/[slug]/page.tsx`
- Create: `src/components/SongCard.tsx`

- [ ] **Step 1: Create ArtistCard component**

```tsx
// src/components/ArtistCard.tsx
import Link from "next/link";
import { User, Music } from "lucide-react";

interface ArtistCardProps {
  name: string;
  slug: string;
  origin: string | null;
  songCount: number;
}

export function ArtistCard({ name, slug, origin, songCount }: ArtistCardProps) {
  return (
    <Link
      href={`/artistes/${slug}`}
      className="block bg-surface rounded-xl p-5 border border-primary/10 hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading text-lg text-text truncate">{name}</h3>
          {origin && (
            <p className="text-sm text-text-muted">{origin}</p>
          )}
          <p className="text-sm text-text-muted mt-1 flex items-center gap-1">
            <Music className="w-3.5 h-3.5" />
            {songCount} {songCount > 1 ? "chansons" : "chanson"}
          </p>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create SongCard component**

```tsx
// src/components/SongCard.tsx
import Link from "next/link";
import { Guitar } from "lucide-react";
import { StyleBadge } from "./StyleBadge";
import type { Style } from "@/types/database";

interface SongCardProps {
  title: string;
  slug: string;
  artistName: string;
  style: Style;
  originalKey: string | null;
}

export function SongCard({ title, slug, artistName, style, originalKey }: SongCardProps) {
  return (
    <Link
      href={`/chansons/${slug}`}
      className="block bg-surface rounded-xl p-5 border border-primary/10 hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-heading text-lg text-text truncate">{title}</h3>
          <p className="text-sm text-text-muted">{artistName}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {originalKey && (
            <span className="text-xs font-mono text-text-muted bg-bg px-2 py-0.5 rounded">
              {originalKey}
            </span>
          )}
          <Guitar className="w-4 h-4 text-text-muted" />
        </div>
      </div>
      <div className="mt-3">
        <StyleBadge style={style} />
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Create artist list page**

```tsx
// src/app/artistes/page.tsx
import { createClient } from "@/lib/supabase/server";
import { ArtistCard } from "@/components/ArtistCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Artistes — Fenua Chords",
  description: "Decouvrez les artistes polynesiens et leurs chansons.",
};

export default async function ArtistesPage() {
  const supabase = await createClient();

  const { data: artists } = await supabase
    .from("artists")
    .select("id, name, slug, origin, songs(count)")
    .order("name");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-heading text-3xl text-primary mb-6">Artistes</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {artists?.map((artist) => (
          <ArtistCard
            key={artist.id}
            name={artist.name}
            slug={artist.slug}
            origin={artist.origin}
            songCount={artist.songs?.[0]?.count ?? 0}
          />
        ))}
      </div>
      {(!artists || artists.length === 0) && (
        <p className="text-text-muted text-center py-12">Aucun artiste pour le moment.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create artist detail page**

```tsx
// src/app/artistes/[slug]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { SongCard } from "@/components/SongCard";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import type { Style } from "@/types/database";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("name, origin")
    .eq("slug", slug)
    .single();

  if (!artist) return { title: "Artiste introuvable" };

  return {
    title: `${artist.name} — Fenua Chords`,
    description: `Accords des chansons de ${artist.name}${artist.origin ? ` (${artist.origin})` : ""}.`,
  };
}

export default async function ArtisteDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("id, name, slug, origin, bio")
    .eq("slug", slug)
    .single();

  if (!artist) notFound();

  const { data: songs } = await supabase
    .from("songs")
    .select("id, title, slug, style, original_key")
    .eq("artist_id", artist.id)
    .eq("status", "published")
    .order("title");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/artistes" className="inline-flex items-center gap-1 text-text-muted hover:text-primary text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> Artistes
      </Link>

      <div className="mb-8">
        <h1 className="font-heading text-3xl text-primary">{artist.name}</h1>
        {artist.origin && <p className="text-text-muted mt-1">{artist.origin}</p>}
        {artist.bio && <p className="text-text mt-3">{artist.bio}</p>}
      </div>

      <h2 className="font-heading text-xl text-text mb-4">
        Chansons ({songs?.length ?? 0})
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {songs?.map((song) => (
          <SongCard
            key={song.id}
            title={song.title}
            slug={song.slug}
            artistName={artist.name}
            style={song.style as Style}
            originalKey={song.original_key}
          />
        ))}
      </div>
      {(!songs || songs.length === 0) && (
        <p className="text-text-muted text-center py-12">Aucune chanson pour le moment.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ArtistCard.tsx src/components/SongCard.tsx src/app/artistes/
git commit -m "feat: add artist list and artist detail pages"
```

---

### Task 7: Song List + Search + Filters

**Files:**
- Create: `src/app/chansons/page.tsx`
- Create: `src/components/SearchBar.tsx`

- [ ] **Step 1: Create SearchBar component**

```tsx
// src/components/SearchBar.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }
    router.push(`/chansons?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Chercher un titre ou un artiste..."
        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-primary/20 bg-surface focus:border-primary text-base"
      />
    </form>
  );
}
```

- [ ] **Step 2: Create song list page with filters**

```tsx
// src/app/chansons/page.tsx
import { createClient } from "@/lib/supabase/server";
import { SongCard } from "@/components/SongCard";
import { SearchBar } from "@/components/SearchBar";
import Link from "next/link";
import type { Metadata } from "next";
import type { Style } from "@/types/database";

export const metadata: Metadata = {
  title: "Chansons — Fenua Chords",
  description: "Trouvez les accords de vos chansons polynesiennes preferees.",
};

const ALL_STYLES: Style[] = ["bringue", "himene", "variete", "traditionnel", "autre"];

interface PageProps {
  searchParams: Promise<{ q?: string; style?: string }>;
}

export default async function ChansonsPage({ searchParams }: PageProps) {
  const { q, style } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("songs")
    .select("id, title, slug, style, original_key, artists(name)")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`title.ilike.%${q}%,artists.name.ilike.%${q}%`);
  }

  if (style && ALL_STYLES.includes(style as Style)) {
    query = query.eq("style", style);
  }

  const { data: songs } = await query;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-heading text-3xl text-primary mb-6">Chansons</h1>

      <div className="mb-6">
        <SearchBar />
      </div>

      {/* Style filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/chansons"
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 cursor-pointer ${
            !style ? "bg-primary text-white" : "bg-surface border border-primary/20 text-text-muted hover:border-primary/40"
          }`}
        >
          Tous
        </Link>
        {ALL_STYLES.map((s) => (
          <Link
            key={s}
            href={`/chansons?style=${s}${q ? `&q=${q}` : ""}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 cursor-pointer ${
              style === s ? "bg-primary text-white" : "bg-surface border border-primary/20 text-text-muted hover:border-primary/40"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {songs?.map((song) => (
          <SongCard
            key={song.id}
            title={song.title}
            slug={song.slug}
            artistName={(song.artists as { name: string } | null)?.name ?? "Inconnu"}
            style={song.style as Style}
            originalKey={song.original_key}
          />
        ))}
      </div>
      {(!songs || songs.length === 0) && (
        <p className="text-text-muted text-center py-12">
          {q ? `Aucun resultat pour "${q}".` : "Aucune chanson pour le moment."}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/SearchBar.tsx src/app/chansons/page.tsx
git commit -m "feat: add song list page with search and style filters"
```

---

## Etape 3 — Fiche Chanson + Rendu Accords

### Task 8: ChordPro Parser + Transpose Logic

**Files:**
- Create: `src/lib/chordpro.ts`
- Create: `src/lib/transpose.ts`

- [ ] **Step 1: Create ChordPro parser**

```tsx
// src/lib/chordpro.ts

export interface ChordSegment {
  chord: string | null;
  text: string;
}

export interface ChordLine {
  segments: ChordSegment[];
}

/**
 * Parse a ChordPro string into structured lines.
 * Input:  "[Am]Ia ora na [G]te here [C]nei"
 * Output: [{ segments: [{ chord: "Am", text: "Ia ora na " }, ...] }]
 */
export function parseChordPro(content: string): ChordLine[] {
  return content.split("\n").map((line) => {
    const segments: ChordSegment[] = [];
    const regex = /\[([^\]]+)\]([^[]*)/g;

    // Text before the first chord
    const firstBracket = line.indexOf("[");
    if (firstBracket > 0) {
      segments.push({ chord: null, text: line.slice(0, firstBracket) });
    } else if (firstBracket === -1) {
      // No chords on this line
      segments.push({ chord: null, text: line });
      return { segments };
    }

    const sub = line.slice(firstBracket > 0 ? firstBracket : 0);
    regex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(sub)) !== null) {
      segments.push({ chord: match[1], text: match[2] });
    }

    return { segments };
  });
}

/**
 * Serialize structured lines back to ChordPro string.
 */
export function serializeChordPro(lines: ChordLine[]): string {
  return lines
    .map((line) =>
      line.segments
        .map((seg) => (seg.chord ? `[${seg.chord}]${seg.text}` : seg.text))
        .join("")
    )
    .join("\n");
}

/**
 * Convert lyrics + chord mapping to ChordPro.
 * mapping: Map<"lineIndex-wordIndex", chord>
 */
export function wordsToChordPro(
  lyrics: string,
  chordMap: Map<string, string>
): string {
  return lyrics
    .split("\n")
    .map((line, lineIdx) => {
      const words = line.split(/(\s+)/);
      let wordIdx = 0;
      return words
        .map((part) => {
          if (/^\s+$/.test(part)) return part;
          const key = `${lineIdx}-${wordIdx}`;
          const chord = chordMap.get(key);
          wordIdx++;
          return chord ? `[${chord}]${part}` : part;
        })
        .join("");
    })
    .join("\n");
}

/**
 * Extract plain lyrics from ChordPro (strips chords).
 */
export function extractLyrics(content: string): string {
  return content.replace(/\[[^\]]+\]/g, "");
}

/**
 * Extract chord map from ChordPro for tap-to-chord mode.
 * Returns Map<"lineIndex-wordIndex", chord>
 */
export function chordProToWordMap(content: string): Map<string, string> {
  const map = new Map<string, string>();

  content.split("\n").forEach((line, lineIdx) => {
    let wordIdx = 0;
    let currentChord: string | null = null;
    const tokens = line.split(/(\[[^\]]+\]|\s+)/);

    for (const token of tokens) {
      const chordMatch = token.match(/^\[([^\]]+)\]$/);
      if (chordMatch) {
        currentChord = chordMatch[1];
        continue;
      }
      if (/^\s*$/.test(token)) continue;
      if (currentChord) {
        map.set(`${lineIdx}-${wordIdx}`, currentChord);
        currentChord = null;
      }
      wordIdx++;
    }
  });

  return map;
}
```

- [ ] **Step 2: Create transpose utility**

```tsx
// src/lib/transpose.ts

const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/**
 * Parse a chord into root note and suffix.
 * "Bbm7" -> { root: "Bb", suffix: "m7" }
 */
function parseChord(chord: string): { root: string; suffix: string } {
  const match = chord.match(/^([A-G][#b]?)(.*)/);
  if (!match) return { root: chord, suffix: "" };
  return { root: match[1], suffix: match[2] };
}

/**
 * Transpose a single chord by N semitones.
 */
function transposeChord(chord: string, semitones: number): string {
  const { root, suffix } = parseChord(chord);

  let noteIndex = NOTES_SHARP.indexOf(root);
  const useFlats = noteIndex === -1;
  if (useFlats) {
    noteIndex = NOTES_FLAT.indexOf(root);
  }
  if (noteIndex === -1) return chord; // Unknown note, return as-is

  const notes = useFlats ? NOTES_FLAT : NOTES_SHARP;
  const newIndex = ((noteIndex + semitones) % 12 + 12) % 12;
  return notes[newIndex] + suffix;
}

/**
 * Transpose all chords in a ChordPro string by N semitones.
 */
export function transposeChordPro(content: string, semitones: number): string {
  if (semitones === 0) return content;
  return content.replace(/\[([^\]]+)\]/g, (_, chord) => {
    return `[${transposeChord(chord, semitones)}]`;
  });
}

/**
 * Get the display key after transposition.
 */
export function getTransposedKey(originalKey: string, semitones: number): string {
  return transposeChord(originalKey, semitones);
}

export { NOTES_SHARP, NOTES_FLAT };
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/chordpro.ts src/lib/transpose.ts
git commit -m "feat: add ChordPro parser and chord transposition logic"
```

---

### Task 9: ChordRenderer + TransposeControls

**Files:**
- Create: `src/components/ChordRenderer.tsx`
- Create: `src/components/TransposeControls.tsx`

- [ ] **Step 1: Create ChordRenderer component**

```tsx
// src/components/ChordRenderer.tsx
import { parseChordPro } from "@/lib/chordpro";

interface ChordRendererProps {
  content: string;
}

export function ChordRenderer({ content }: ChordRendererProps) {
  const lines = parseChordPro(content);

  return (
    <div className="font-body text-base leading-relaxed space-y-1">
      {lines.map((line, lineIdx) => (
        <div key={lineIdx} className="flex flex-wrap">
          {line.segments.map((segment, segIdx) => (
            <span key={segIdx} className="inline-block relative" style={{ paddingTop: segment.chord ? "1.4em" : "0" }}>
              {segment.chord && (
                <span className="absolute top-0 left-0 font-mono font-bold text-chord text-sm whitespace-nowrap">
                  {segment.chord}
                </span>
              )}
              <span className="whitespace-pre-wrap">{segment.text || "\u00A0"}</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create TransposeControls component**

```tsx
// src/components/TransposeControls.tsx
"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { getTransposedKey } from "@/lib/transpose";

interface TransposeControlsProps {
  originalKey: string | null;
  onChange: (semitones: number) => void;
}

export function TransposeControls({ originalKey, onChange }: TransposeControlsProps) {
  const [semitones, setSemitones] = useState(0);

  function adjust(delta: number) {
    const next = semitones + delta;
    setSemitones(next);
    onChange(next);
  }

  const displayKey = originalKey
    ? getTransposedKey(originalKey, semitones)
    : null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-text-muted">Transposer :</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => adjust(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-primary/20 hover:bg-primary/10 transition-colors duration-200 cursor-pointer"
          aria-label="Baisser d'un demi-ton"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-12 text-center font-mono text-sm">
          {semitones > 0 ? `+${semitones}` : semitones}
        </span>
        <button
          onClick={() => adjust(1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-primary/20 hover:bg-primary/10 transition-colors duration-200 cursor-pointer"
          aria-label="Monter d'un demi-ton"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {displayKey && (
        <span className="text-sm font-mono bg-bg px-2 py-0.5 rounded">
          {displayKey}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ChordRenderer.tsx src/components/TransposeControls.tsx
git commit -m "feat: add ChordRenderer and TransposeControls components"
```

---

### Task 10: Song Detail Page (ISR + SEO)

**Files:**
- Create: `src/app/chansons/[slug]/page.tsx`
- Create: `src/app/chansons/[slug]/SongDetailClient.tsx`

- [ ] **Step 1: Create song detail page (server component)**

```tsx
// src/app/chansons/[slug]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import type { Style, Instrument } from "@/types/database";
import { StyleBadge } from "@/components/StyleBadge";
import { SongDetailClient } from "./SongDetailClient";

export const revalidate = 3600; // ISR: revalidate every hour

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: song } = await supabase
    .from("songs")
    .select("title, artists(name)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!song) return { title: "Chanson introuvable" };

  const artistName = (song.artists as { name: string } | null)?.name ?? "Inconnu";

  return {
    title: `${song.title} — ${artistName} | Fenua Chords`,
    description: `Accords et paroles de ${song.title} par ${artistName}. Grille d'accords pour guitare et ukulele.`,
    openGraph: {
      title: `${song.title} — ${artistName}`,
      description: `Accords de ${song.title} par ${artistName} sur Fenua Chords.`,
    },
  };
}

export default async function SongDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: song } = await supabase
    .from("songs")
    .select(`
      id, title, slug, style, original_key, bpm, youtube_url, language,
      artists(name, slug),
      chord_sheets(id, instrument, tuning, capo, content, contributed_by, is_official, created_at,
        profiles:contributed_by(username)
      )
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!song) notFound();

  const artist = song.artists as { name: string; slug: string } | null;
  const chordSheets = (song.chord_sheets ?? []) as Array<{
    id: string;
    instrument: Instrument;
    tuning: string | null;
    capo: number | null;
    content: string;
    contributed_by: string;
    is_official: boolean;
    created_at: string;
    profiles: { username: string } | null;
  }>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/chansons" className="inline-flex items-center gap-1 text-text-muted hover:text-primary text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> Chansons
      </Link>

      <div className="mb-6">
        <h1 className="font-heading text-3xl text-primary">{song.title}</h1>
        {artist && (
          <Link href={`/artistes/${artist.slug}`} className="text-text-muted hover:text-primary text-lg">
            {artist.name}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <StyleBadge style={song.style as Style} />
          {song.original_key && (
            <span className="text-sm font-mono bg-bg px-2 py-0.5 rounded">
              Tonalite : {song.original_key}
            </span>
          )}
          {song.bpm && (
            <span className="text-sm text-text-muted">{song.bpm} BPM</span>
          )}
        </div>
      </div>

      {chordSheets.length > 0 ? (
        <SongDetailClient
          chordSheets={chordSheets}
          originalKey={song.original_key}
        />
      ) : (
        <div className="text-center py-12 text-text-muted">
          <p>Pas encore d&apos;accords pour cette chanson.</p>
          <Link href="/contribuer" className="text-primary hover:underline mt-2 inline-block">
            Contribuer les accords
          </Link>
        </div>
      )}

      {song.youtube_url && (
        <div className="mt-8">
          <a
            href={song.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm"
          >
            Ecouter sur YouTube
          </a>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create client component for interactivity**

```tsx
// src/app/chansons/[slug]/SongDetailClient.tsx
"use client";

import { useState } from "react";
import { ChordRenderer } from "@/components/ChordRenderer";
import { TransposeControls } from "@/components/TransposeControls";
import { transposeChordPro } from "@/lib/transpose";
import type { Instrument } from "@/types/database";

interface ChordSheetData {
  id: string;
  instrument: Instrument;
  tuning: string | null;
  capo: number | null;
  content: string;
  is_official: boolean;
  profiles: { username: string } | null;
}

interface SongDetailClientProps {
  chordSheets: ChordSheetData[];
  originalKey: string | null;
}

const instrumentLabels: Record<Instrument, string> = {
  guitare: "Guitare",
  ukulele: "Ukulele",
  basse: "Basse",
  "ukulele-bass": "Ukulele Bass",
};

export function SongDetailClient({ chordSheets, originalKey }: SongDetailClientProps) {
  const [activeSheet, setActiveSheet] = useState(0);
  const [semitones, setSemitones] = useState(0);

  const sheet = chordSheets[activeSheet];
  const transposedContent = transposeChordPro(sheet.content, semitones);

  return (
    <div>
      {chordSheets.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {chordSheets.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => { setActiveSheet(idx); setSemitones(0); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer ${
                idx === activeSheet
                  ? "bg-primary text-white"
                  : "bg-surface border border-primary/20 text-text-muted hover:border-primary/40"
              }`}
            >
              {instrumentLabels[s.instrument]}
              {s.is_official && " (officiel)"}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-text-muted">
        <span>{instrumentLabels[sheet.instrument]}</span>
        {sheet.capo !== null && sheet.capo > 0 && <span>Capo {sheet.capo}</span>}
        {sheet.tuning && <span>Tuning : {sheet.tuning}</span>}
        {sheet.profiles && <span>par {sheet.profiles.username}</span>}
      </div>

      <div className="mb-6">
        <TransposeControls originalKey={originalKey} onChange={setSemitones} />
      </div>

      <div className="bg-surface rounded-xl p-6 border border-primary/10">
        <ChordRenderer content={transposedContent} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/chansons/\[slug\]/
git commit -m "feat: add song detail page with chord rendering, transposition, ISR + SEO"
```

---

## Etape 4 — Editeur d'accords

### Task 11: ChordPicker (Bottom Sheet)

**Files:**
- Create: `src/components/chord-editor/ChordPicker.tsx`

- [ ] **Step 1: Create ChordPicker component**

```tsx
// src/components/chord-editor/ChordPicker.tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";

const COMMON_CHORDS = [
  "Am", "A", "Bm", "B", "Cm", "C",
  "Dm", "D", "Em", "E", "Fm", "F", "Gm", "G",
];

interface ChordPickerProps {
  recentChords: string[];
  onSelect: (chord: string) => void;
  onRemove: () => void;
  onClose: () => void;
  currentChord: string | null;
}

export function ChordPicker({
  recentChords,
  onSelect,
  onRemove,
  onClose,
  currentChord,
}: ChordPickerProps) {
  const [custom, setCustom] = useState("");

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (custom.trim()) {
      onSelect(custom.trim());
      setCustom("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-surface rounded-t-2xl p-4 pb-8 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {currentChord && (
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm text-text-muted">
              Accord actuel : <span className="font-mono font-bold text-chord">{currentChord}</span>
            </span>
            <button
              onClick={onRemove}
              className="text-sm text-red-500 hover:underline cursor-pointer"
            >
              Supprimer
            </button>
          </div>
        )}

        {recentChords.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-text-muted mb-1.5 px-1">Recents</p>
            <div className="flex flex-wrap gap-2">
              {recentChords.map((chord) => (
                <button
                  key={chord}
                  onClick={() => onSelect(chord)}
                  className="min-w-[44px] h-[44px] flex items-center justify-center rounded-lg bg-secondary/15 text-secondary font-mono font-bold text-sm hover:bg-secondary/25 transition-colors duration-150 cursor-pointer"
                >
                  {chord}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-7 gap-2 mb-3">
          {COMMON_CHORDS.map((chord) => (
            <button
              key={chord}
              onClick={() => onSelect(chord)}
              className="min-w-[44px] h-[44px] flex items-center justify-center rounded-lg border border-primary/20 font-mono text-sm font-bold hover:bg-primary/10 transition-colors duration-150 cursor-pointer"
            >
              {chord}
            </button>
          ))}
        </div>

        <form onSubmit={handleCustomSubmit} className="flex gap-2">
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Accord custom (ex: Bbm7)"
            className="flex-1 px-3 py-2.5 rounded-lg border border-primary/20 bg-bg text-sm font-mono"
          />
          <button
            type="submit"
            disabled={!custom.trim()}
            className="px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-40 cursor-pointer"
          >
            OK
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/chord-editor/ChordPicker.tsx
git commit -m "feat: add ChordPicker bottom-sheet component"
```

---

### Task 12: TapToChord Mode

**Files:**
- Create: `src/components/chord-editor/TapToChord.tsx`

- [ ] **Step 1: Create TapToChord component**

```tsx
// src/components/chord-editor/TapToChord.tsx
"use client";

import { useState } from "react";
import { ChordPicker } from "./ChordPicker";

interface TapToChordProps {
  lyrics: string;
  chordMap: Map<string, string>;
  onChordMapChange: (map: Map<string, string>) => void;
}

export function TapToChord({ lyrics, chordMap, onChordMapChange }: TapToChordProps) {
  const [activePicker, setActivePicker] = useState<string | null>(null);
  const [recentChords, setRecentChords] = useState<string[]>([]);

  const lines = lyrics.split("\n");

  function handleSelectChord(chord: string) {
    if (!activePicker) return;

    const newMap = new Map(chordMap);
    newMap.set(activePicker, chord);
    onChordMapChange(newMap);

    setRecentChords((prev) => {
      const filtered = prev.filter((c) => c !== chord);
      return [chord, ...filtered].slice(0, 6);
    });

    setActivePicker(null);
  }

  function handleRemoveChord() {
    if (!activePicker) return;
    const newMap = new Map(chordMap);
    newMap.delete(activePicker);
    onChordMapChange(newMap);
    setActivePicker(null);
  }

  return (
    <div>
      <div className="space-y-1 bg-surface rounded-xl p-4 border border-primary/10">
        {lines.map((line, lineIdx) => {
          if (line.trim() === "") {
            return <div key={lineIdx} className="h-4" />;
          }

          const words = line.split(/(\s+)/);
          let wordIdx = 0;

          return (
            <div key={lineIdx} className="flex flex-wrap">
              {words.map((part, partIdx) => {
                if (/^\s+$/.test(part)) {
                  return <span key={partIdx} className="whitespace-pre">{part}</span>;
                }

                const key = `${lineIdx}-${wordIdx}`;
                const chord = chordMap.get(key);
                wordIdx++;

                return (
                  <button
                    key={partIdx}
                    type="button"
                    onClick={() => setActivePicker(key)}
                    className="relative inline-block cursor-pointer rounded px-0.5 hover:bg-primary/10 transition-colors duration-150"
                    style={{ paddingTop: chord ? "1.4em" : "0.2em" }}
                  >
                    {chord && (
                      <span className="absolute top-0 left-0 font-mono font-bold text-chord text-sm whitespace-nowrap">
                        {chord}
                      </span>
                    )}
                    <span>{part}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {activePicker && (
        <ChordPicker
          recentChords={recentChords}
          onSelect={handleSelectChord}
          onRemove={handleRemoveChord}
          onClose={() => setActivePicker(null)}
          currentChord={chordMap.get(activePicker) ?? null}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/chord-editor/TapToChord.tsx
git commit -m "feat: add TapToChord visual chord placement mode"
```

---

### Task 13: ChordProTextarea + ChordPreview

**Files:**
- Create: `src/components/chord-editor/ChordPreview.tsx`
- Create: `src/components/chord-editor/ChordProTextarea.tsx`

- [ ] **Step 1: Create ChordPreview component**

```tsx
// src/components/chord-editor/ChordPreview.tsx
import { ChordRenderer } from "@/components/ChordRenderer";

interface ChordPreviewProps {
  content: string;
}

export function ChordPreview({ content }: ChordPreviewProps) {
  if (!content.trim()) {
    return <p className="text-text-muted text-sm italic">La preview apparaitra ici...</p>;
  }
  return <ChordRenderer content={content} />;
}
```

- [ ] **Step 2: Create ChordProTextarea component**

```tsx
// src/components/chord-editor/ChordProTextarea.tsx
"use client";

import { ChordPreview } from "./ChordPreview";

interface ChordProTextareaProps {
  value: string;
  onChange: (value: string) => void;
}

export function ChordProTextarea({ value, onChange }: ChordProTextareaProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-text-muted mb-2">
          Place tes accords entre crochets : <code className="font-mono bg-bg px-1 rounded">[Am]paroles</code>
        </p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="[Am]Ia ora na [G]te here [C]nei..."
          rows={12}
          className="w-full px-4 py-3 rounded-lg border border-primary/20 bg-surface font-mono text-sm leading-relaxed resize-y focus:border-primary"
        />
      </div>

      <div>
        <p className="text-xs text-text-muted mb-2">Preview</p>
        <div className="bg-surface rounded-xl p-4 border border-primary/10 min-h-[100px]">
          <ChordPreview content={value} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/chord-editor/ChordPreview.tsx src/components/chord-editor/ChordProTextarea.tsx
git commit -m "feat: add ChordProTextarea mode with live preview"
```

---

### Task 14: ChordEditor Container

**Files:**
- Create: `src/components/chord-editor/ChordEditor.tsx`

- [ ] **Step 1: Create ChordEditor container**

```tsx
// src/components/chord-editor/ChordEditor.tsx
"use client";

import { useState, useCallback } from "react";
import { TapToChord } from "./TapToChord";
import { ChordProTextarea } from "./ChordProTextarea";
import {
  wordsToChordPro,
  extractLyrics,
  chordProToWordMap,
} from "@/lib/chordpro";

type EditorMode = "simple" | "texte";

interface ChordEditorProps {
  initialContent?: string;
  onContentChange: (chordPro: string) => void;
}

export function ChordEditor({ initialContent = "", onContentChange }: ChordEditorProps) {
  const [mode, setMode] = useState<EditorMode>("simple");

  // Simple mode state
  const [lyrics, setLyrics] = useState(() => extractLyrics(initialContent));
  const [chordMap, setChordMap] = useState<Map<string, string>>(
    () => chordProToWordMap(initialContent)
  );
  const [lyricsConfirmed, setLyricsConfirmed] = useState(initialContent.length > 0);

  // Text mode state
  const [chordProText, setChordProText] = useState(initialContent);

  const emitContent = useCallback(
    (content: string) => {
      onContentChange(content);
    },
    [onContentChange]
  );

  function switchMode(newMode: EditorMode) {
    if (newMode === mode) return;

    if (newMode === "texte") {
      const chordPro = wordsToChordPro(lyrics, chordMap);
      setChordProText(chordPro);
    } else {
      setLyrics(extractLyrics(chordProText));
      setChordMap(chordProToWordMap(chordProText));
      setLyricsConfirmed(true);
    }

    setMode(newMode);
  }

  function handleChordMapChange(map: Map<string, string>) {
    setChordMap(map);
    emitContent(wordsToChordPro(lyrics, map));
  }

  function handleChordProChange(text: string) {
    setChordProText(text);
    emitContent(text);
  }

  function handleConfirmLyrics() {
    setLyricsConfirmed(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => switchMode("simple")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer ${
            mode === "simple"
              ? "bg-primary text-white"
              : "bg-surface border border-primary/20 text-text-muted"
          }`}
        >
          Mode simple
        </button>
        <button
          type="button"
          onClick={() => switchMode("texte")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer ${
            mode === "texte"
              ? "bg-primary text-white"
              : "bg-surface border border-primary/20 text-text-muted"
          }`}
        >
          Mode texte
        </button>
      </div>

      {mode === "simple" ? (
        !lyricsConfirmed ? (
          <div className="space-y-3">
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Colle ou tape les paroles ici..."
              rows={10}
              className="w-full px-4 py-3 rounded-lg border border-primary/20 bg-surface text-base leading-relaxed resize-y focus:border-primary"
            />
            <button
              type="button"
              onClick={handleConfirmLyrics}
              disabled={!lyrics.trim()}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-40 cursor-pointer"
            >
              Placer les accords
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <TapToChord
              lyrics={lyrics}
              chordMap={chordMap}
              onChordMapChange={handleChordMapChange}
            />
            <button
              type="button"
              onClick={() => setLyricsConfirmed(false)}
              className="text-sm text-text-muted hover:text-primary cursor-pointer"
            >
              Modifier les paroles
            </button>
          </div>
        )
      ) : (
        <ChordProTextarea
          value={chordProText}
          onChange={handleChordProChange}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/chord-editor/ChordEditor.tsx
git commit -m "feat: add ChordEditor container with mode toggle and state sync"
```

---

### Task 15: Song Form + Contribute Page

**Files:**
- Create: `src/components/SongForm.tsx`
- Create: `src/app/contribuer/page.tsx`

- [ ] **Step 1: Create SongForm component**

```tsx
// src/components/SongForm.tsx
"use client";

import type { Style, Instrument } from "@/types/database";

interface SongFormData {
  title: string;
  artistName: string;
  style: Style;
  instrument: Instrument;
  originalKey: string;
  capo: number;
  tuning: string;
}

interface SongFormProps {
  data: SongFormData;
  onChange: (data: SongFormData) => void;
}

const STYLES: { value: Style; label: string }[] = [
  { value: "bringue", label: "Bringue" },
  { value: "himene", label: "Himene" },
  { value: "variete", label: "Variete" },
  { value: "traditionnel", label: "Traditionnel" },
  { value: "autre", label: "Autre" },
];

const INSTRUMENTS: { value: Instrument; label: string }[] = [
  { value: "guitare", label: "Guitare" },
  { value: "ukulele", label: "Ukulele" },
  { value: "basse", label: "Basse" },
  { value: "ukulele-bass", label: "Ukulele Bass" },
];

const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
              "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bm"];

export function SongForm({ data, onChange }: SongFormProps) {
  function update(field: keyof SongFormData, value: string | number) {
    onChange({ ...data, [field]: value });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label htmlFor="title" className="block text-sm font-medium mb-1">Titre de la chanson *</label>
        <input
          id="title"
          type="text"
          required
          value={data.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Ex: Ia Ora Na"
          className="w-full px-3 py-2.5 rounded-lg border border-primary/20 bg-surface text-base focus:border-primary"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="artist" className="block text-sm font-medium mb-1">Artiste *</label>
        <input
          id="artist"
          type="text"
          required
          value={data.artistName}
          onChange={(e) => update("artistName", e.target.value)}
          placeholder="Ex: Bobby Holcomb"
          className="w-full px-3 py-2.5 rounded-lg border border-primary/20 bg-surface text-base focus:border-primary"
        />
        <p className="text-xs text-text-muted mt-1">
          Si l&apos;artiste n&apos;existe pas encore, il sera cree automatiquement.
        </p>
      </div>

      <div>
        <label htmlFor="style" className="block text-sm font-medium mb-1">Style *</label>
        <select
          id="style"
          value={data.style}
          onChange={(e) => update("style", e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-primary/20 bg-surface text-base focus:border-primary cursor-pointer"
        >
          {STYLES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="instrument" className="block text-sm font-medium mb-1">Instrument *</label>
        <select
          id="instrument"
          value={data.instrument}
          onChange={(e) => update("instrument", e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-primary/20 bg-surface text-base focus:border-primary cursor-pointer"
        >
          {INSTRUMENTS.map((i) => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="key" className="block text-sm font-medium mb-1">Tonalite</label>
        <select
          id="key"
          value={data.originalKey}
          onChange={(e) => update("originalKey", e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-primary/20 bg-surface text-base focus:border-primary cursor-pointer"
        >
          <option value="">Non specifiee</option>
          {KEYS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="capo" className="block text-sm font-medium mb-1">Capo</label>
        <select
          id="capo"
          value={data.capo}
          onChange={(e) => update("capo", Number(e.target.value))}
          className="w-full px-3 py-2.5 rounded-lg border border-primary/20 bg-surface text-base focus:border-primary cursor-pointer"
        >
          {Array.from({ length: 13 }, (_, i) => (
            <option key={i} value={i}>{i === 0 ? "Sans capo" : `Capo ${i}`}</option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="tuning" className="block text-sm font-medium mb-1">Tuning</label>
        <input
          id="tuning"
          type="text"
          value={data.tuning}
          onChange={(e) => update("tuning", e.target.value)}
          placeholder="Ex: Standard, Open G, Low G..."
          className="w-full px-3 py-2.5 rounded-lg border border-primary/20 bg-surface text-base focus:border-primary"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create contribute page**

```tsx
// src/app/contribuer/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChordEditor } from "@/components/chord-editor/ChordEditor";
import { SongForm } from "@/components/SongForm";
import { ChordPreview } from "@/components/chord-editor/ChordPreview";
import { slugify } from "@/lib/slugify";
import type { Style, Instrument } from "@/types/database";

interface FormData {
  title: string;
  artistName: string;
  style: Style;
  instrument: Instrument;
  originalKey: string;
  capo: number;
  tuning: string;
}

export default function ContribuerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState<FormData>({
    title: "",
    artistName: "",
    style: "bringue",
    instrument: "guitare",
    originalKey: "",
    capo: 0,
    tuning: "",
  });
  const [chordProContent, setChordProContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/connexion");
        return;
      }

      // Find or create artist
      const artistSlug = slugify(formData.artistName);
      let { data: artist } = await supabase
        .from("artists")
        .select("id")
        .eq("slug", artistSlug)
        .single();

      if (!artist) {
        const { data: newArtist, error: artistError } = await supabase
          .from("artists")
          .insert({ name: formData.artistName, slug: artistSlug })
          .select("id")
          .single();
        if (artistError) throw artistError;
        artist = newArtist;
      }

      // Create song
      const songSlug = slugify(formData.title);
      const { data: song, error: songError } = await supabase
        .from("songs")
        .insert({
          title: formData.title,
          slug: songSlug,
          artist_id: artist.id,
          style: formData.style,
          original_key: formData.originalKey || null,
          created_by: user.id,
          status: "published",
        })
        .select("id, slug")
        .single();
      if (songError) throw songError;

      // Create chord sheet
      const { error: sheetError } = await supabase
        .from("chord_sheets")
        .insert({
          song_id: song.id,
          instrument: formData.instrument,
          capo: formData.capo,
          tuning: formData.tuning || null,
          content: chordProContent,
          contributed_by: user.id,
        });
      if (sheetError) throw sheetError;

      router.push(`/chansons/${song.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la soumission.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = formData.title.trim() && formData.artistName.trim() && chordProContent.trim();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-heading text-3xl text-primary mb-6">Contribuer</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section>
          <h2 className="font-heading text-xl text-text mb-4">Informations</h2>
          <SongForm data={formData} onChange={setFormData} />
        </section>

        <section>
          <h2 className="font-heading text-xl text-text mb-4">Accords</h2>
          <ChordEditor onContentChange={setChordProContent} />
        </section>

        {chordProContent.trim() && (
          <section>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-primary hover:underline cursor-pointer"
            >
              {showPreview ? "Masquer la preview" : "Voir la preview"}
            </button>
            {showPreview && (
              <div className="mt-3 bg-surface rounded-xl p-6 border border-primary/10">
                <ChordPreview content={chordProContent} />
              </div>
            )}
          </section>
        )}

        {error && (
          <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="w-full bg-cta text-white py-3 rounded-lg font-semibold text-lg hover:bg-cta/90 transition-colors duration-200 disabled:opacity-40 cursor-pointer"
        >
          {loading ? "Publication..." : "Publier la fiche"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/SongForm.tsx src/app/contribuer/page.tsx
git commit -m "feat: add contribute page with song form and chord editor"
```

---

### Task 16: Edit Chord Sheet Page

**Files:**
- Create: `src/app/contribuer/[id]/edit/page.tsx`

- [ ] **Step 1: Create edit page**

```tsx
// src/app/contribuer/[id]/edit/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChordEditor } from "@/components/chord-editor/ChordEditor";
import type { Instrument } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

const INSTRUMENTS: { value: Instrument; label: string }[] = [
  { value: "guitare", label: "Guitare" },
  { value: "ukulele", label: "Ukulele" },
  { value: "basse", label: "Basse" },
  { value: "ukulele-bass", label: "Ukulele Bass" },
];

export default function EditChordSheetPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [content, setContent] = useState("");
  const [instrument, setInstrument] = useState<Instrument>("guitare");
  const [capo, setCapo] = useState(0);
  const [tuning, setTuning] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [songSlug, setSongSlug] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/connexion");
        return;
      }

      const { data: sheet, error } = await supabase
        .from("chord_sheets")
        .select("content, instrument, capo, tuning, contributed_by, songs(slug)")
        .eq("id", id)
        .single();

      if (error || !sheet) {
        setError("Fiche introuvable.");
        setLoading(false);
        return;
      }

      if (sheet.contributed_by !== user.id) {
        setError("Tu ne peux modifier que tes propres fiches.");
        setLoading(false);
        return;
      }

      setContent(sheet.content);
      setInstrument(sheet.instrument as Instrument);
      setCapo(sheet.capo ?? 0);
      setTuning(sheet.tuning ?? "");
      setSongSlug((sheet.songs as { slug: string } | null)?.slug ?? null);
      setLoading(false);
    }

    load();
  }, [id, supabase, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("chord_sheets")
      .update({
        content,
        instrument,
        capo,
        tuning: tuning || null,
      })
      .eq("id", id);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    if (songSlug) {
      router.push(`/chansons/${songSlug}`);
    } else {
      router.push("/chansons");
    }
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8 text-text-muted">Chargement...</div>;

  if (error && !content) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-heading text-3xl text-primary mb-6">Modifier la fiche</h1>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="instrument" className="block text-sm font-medium mb-1">Instrument</label>
            <select
              id="instrument"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value as Instrument)}
              className="w-full px-3 py-2.5 rounded-lg border border-primary/20 bg-surface cursor-pointer"
            >
              {INSTRUMENTS.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="capo" className="block text-sm font-medium mb-1">Capo</label>
            <select
              id="capo"
              value={capo}
              onChange={(e) => setCapo(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg border border-primary/20 bg-surface cursor-pointer"
            >
              {Array.from({ length: 13 }, (_, i) => (
                <option key={i} value={i}>{i === 0 ? "Sans capo" : `Capo ${i}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tuning" className="block text-sm font-medium mb-1">Tuning</label>
            <input
              id="tuning"
              type="text"
              value={tuning}
              onChange={(e) => setTuning(e.target.value)}
              placeholder="Standard"
              className="w-full px-3 py-2.5 rounded-lg border border-primary/20 bg-surface"
            />
          </div>
        </div>

        <ChordEditor
          initialContent={content}
          onContentChange={setContent}
        />

        {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

        <button
          type="submit"
          disabled={!content.trim() || saving}
          className="w-full bg-cta text-white py-3 rounded-lg font-semibold text-lg hover:bg-cta/90 transition-colors duration-200 disabled:opacity-40 cursor-pointer"
        >
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/contribuer/\[id\]/
git commit -m "feat: add chord sheet edit page (owner only)"
```

---

## Etape 5 — Landing Page

### Task 17: Landing Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace landing page**

```tsx
// src/app/page.tsx
import { createClient } from "@/lib/supabase/server";
import { SongCard } from "@/components/SongCard";
import { StyleBadge } from "@/components/StyleBadge";
import Link from "next/link";
import { Music, Users, Guitar } from "lucide-react";
import type { Style } from "@/types/database";

const ALL_STYLES: Style[] = ["bringue", "himene", "variete", "traditionnel", "autre"];

export default async function HomePage() {
  const supabase = await createClient();

  const { data: recentSongs } = await supabase
    .from("songs")
    .select("id, title, slug, style, original_key, artists(name)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(6);

  const { count: songCount } = await supabase
    .from("songs")
    .select("*", { count: "exact", head: true })
    .eq("status", "published");

  const { count: artistCount } = await supabase
    .from("artists")
    .select("*", { count: "exact", head: true });

  const { count: contributorCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  return (
    <div>
      {/* Hero */}
      <section className="text-center py-16 px-4">
        <h1 className="font-heading text-4xl md:text-5xl text-primary mb-4">
          Fenua Chords
        </h1>
        <p className="text-lg text-text-muted max-w-xl mx-auto mb-8">
          Les accords de tes chants polynesiens preferes. Bringues, himene, variete — tout est la.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/chansons"
            className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors duration-200 cursor-pointer"
          >
            Explorer les chants
          </Link>
          <Link
            href="/contribuer"
            className="bg-cta text-white px-6 py-3 rounded-lg font-semibold hover:bg-cta/90 transition-colors duration-200 cursor-pointer"
          >
            Contribuer
          </Link>
        </div>
      </section>

      {/* Counters */}
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-surface rounded-xl p-4 border border-primary/10">
            <Music className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="font-heading text-2xl text-primary">{songCount ?? 0}</p>
            <p className="text-sm text-text-muted">chansons</p>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-primary/10">
            <Guitar className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="font-heading text-2xl text-primary">{artistCount ?? 0}</p>
            <p className="text-sm text-text-muted">artistes</p>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-primary/10">
            <Users className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="font-heading text-2xl text-primary">{contributorCount ?? 0}</p>
            <p className="text-sm text-text-muted">contributeurs</p>
          </div>
        </div>
      </section>

      {/* Styles */}
      <section className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="font-heading text-2xl text-text mb-4 text-center">Par style</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {ALL_STYLES.map((style) => (
            <Link
              key={style}
              href={`/chansons?style=${style}`}
              className="cursor-pointer hover:scale-105 transition-transform duration-200"
            >
              <StyleBadge style={style} />
            </Link>
          ))}
        </div>
      </section>

      {/* Recent songs */}
      {recentSongs && recentSongs.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="font-heading text-2xl text-text mb-4">Derniers ajouts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentSongs.map((song) => (
              <SongCard
                key={song.id}
                title={song.title}
                slug={song.slug}
                artistName={(song.artists as { name: string } | null)?.name ?? "Inconnu"}
                style={song.style as Style}
                originalKey={song.original_key}
              />
            ))}
          </div>
          <div className="text-center mt-6">
            <Link href="/chansons" className="text-primary hover:underline font-medium">
              Voir toutes les chansons
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add landing page (hero, counters, styles, recent songs)"
```

---

## Etape 6 — Polish & Deploy

### Task 18: Error Pages

**Files:**
- Create: `src/app/not-found.tsx`
- Create: `src/app/error.tsx`

- [ ] **Step 1: Create 404 page**

```tsx
// src/app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="text-center">
        <h1 className="font-heading text-6xl text-primary mb-4">404</h1>
        <p className="text-text-muted text-lg mb-6">Cette page n&apos;existe pas.</p>
        <Link
          href="/"
          className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors duration-200 cursor-pointer"
        >
          Retour a l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create error page**

```tsx
// src/app/error.tsx
"use client";

interface ErrorProps {
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorProps) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="text-center">
        <h1 className="font-heading text-4xl text-primary mb-4">Oups</h1>
        <p className="text-text-muted text-lg mb-6">Quelque chose s&apos;est mal passe.</p>
        <button
          onClick={reset}
          className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors duration-200 cursor-pointer"
        >
          Reessayer
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/not-found.tsx src/app/error.tsx
git commit -m "feat: add 404 and error pages"
```

---

### Task 19: Sitemap + Loading States

**Files:**
- Create: `src/app/sitemap.ts`
- Create: `src/app/chansons/loading.tsx`
- Create: `src/app/artistes/loading.tsx`

- [ ] **Step 1: Create dynamic sitemap**

```tsx
// src/app/sitemap.ts
import { createClient } from "@/lib/supabase/server";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fenua-chords.vercel.app";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/chansons`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/artistes`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ];

  const { data: songs } = await supabase
    .from("songs")
    .select("slug, created_at")
    .eq("status", "published");

  const songRoutes: MetadataRoute.Sitemap = (songs ?? []).map((song) => ({
    url: `${baseUrl}/chansons/${song.slug}`,
    lastModified: new Date(song.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const { data: artists } = await supabase
    .from("artists")
    .select("slug, created_at");

  const artistRoutes: MetadataRoute.Sitemap = (artists ?? []).map((artist) => ({
    url: `${baseUrl}/artistes/${artist.slug}`,
    lastModified: new Date(artist.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...songRoutes, ...artistRoutes];
}
```

- [ ] **Step 2: Create loading skeletons**

```tsx
// src/app/chansons/loading.tsx
export default function ChansonsLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="h-9 w-40 bg-primary/10 rounded animate-pulse mb-6" />
      <div className="h-11 w-full bg-primary/5 rounded-lg animate-pulse mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl p-5 border border-primary/10 space-y-3">
            <div className="h-5 w-3/4 bg-primary/10 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-primary/5 rounded animate-pulse" />
            <div className="h-5 w-20 bg-primary/10 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/artistes/loading.tsx
export default function ArtistesLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="h-9 w-40 bg-primary/10 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl p-5 border border-primary/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-2/3 bg-primary/10 rounded animate-pulse" />
                <div className="h-4 w-1/3 bg-primary/5 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts src/app/chansons/loading.tsx src/app/artistes/loading.tsx
git commit -m "feat: add sitemap, loading skeletons"
```

---

### Task 20: Final Build + Lint Check

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no lint errors.

- [ ] **Step 3: Fix any issues and commit**

If build or lint revealed issues, fix and commit:

```bash
git add -A
git commit -m "fix: resolve build/lint issues for production"
```

---

### Task 21: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Connect Vercel**

User action: go to vercel.com, import the `fenua-chords` repo. Set environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (the Vercel deployment URL, for sitemap)

- [ ] **Step 3: Verify deployment**

Test the full flow:
1. Homepage loads with hero + counters
2. Navigate to `/artistes` and `/chansons`
3. Click on a song to see chord rendering
4. Transpose chords up/down
5. Sign up with email/password
6. Contribute a new song with tap-to-chord
7. Edit the chord sheet
8. Verify `/sitemap.xml` loads

---

## Summary

| Task | Etape | What | Files |
|------|-------|------|-------|
| 1 | 1 | DB Migrations (schema, RLS, seed) | `supabase/migrations/` |
| 2 | 1 | Design System (fonts, palette, globals) | `globals.css`, `layout.tsx` |
| 3 | 1 | Header + Footer + Layout Shell | `Header.tsx`, `Footer.tsx`, `MobileMenu.tsx` |
| 4 | 1 | Auth (login, callback, guard, header) | `connexion/`, `callback/`, `auth-guard.ts` |
| 5 | 2 | Slugify + StyleBadge utilities | `slugify.ts`, `StyleBadge.tsx` |
| 6 | 2 | Artist list + detail pages | `artistes/`, `ArtistCard.tsx`, `SongCard.tsx` |
| 7 | 2 | Song list + search + filters | `chansons/page.tsx`, `SearchBar.tsx` |
| 8 | 3 | ChordPro parser + transpose logic | `chordpro.ts`, `transpose.ts` |
| 9 | 3 | ChordRenderer + TransposeControls | `ChordRenderer.tsx`, `TransposeControls.tsx` |
| 10 | 3 | Song detail page (ISR + SEO) | `chansons/[slug]/` |
| 11 | 4 | ChordPicker bottom sheet | `chord-editor/ChordPicker.tsx` |
| 12 | 4 | TapToChord mode | `chord-editor/TapToChord.tsx` |
| 13 | 4 | ChordProTextarea + ChordPreview | `ChordProTextarea.tsx`, `ChordPreview.tsx` |
| 14 | 4 | ChordEditor container | `chord-editor/ChordEditor.tsx` |
| 15 | 4 | Song form + contribute page | `SongForm.tsx`, `contribuer/page.tsx` |
| 16 | 4 | Edit chord sheet page | `contribuer/[id]/edit/` |
| 17 | 5 | Landing page | `page.tsx` |
| 18 | 6 | Error pages (404, 500) | `not-found.tsx`, `error.tsx` |
| 19 | 6 | Sitemap + loading states | `sitemap.ts`, `loading.tsx` |
| 20 | 6 | Final build + lint check | — |
| 21 | 6 | Deploy to Vercel | — |
