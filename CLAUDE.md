# Fenua Chords

Plateforme web communautaire pour partager les accords de chants polynesiens.

## Stack

- Next.js 16 App Router + TypeScript strict
- Supabase (Postgres + Auth magic link + RLS + Storage)
- Tailwind CSS v4
- Deploy: Vercel

## Architecture

```
src/
  app/           # App Router pages et layouts
  components/    # Composants React reutilisables
  lib/           # Utilitaires, clients, helpers
    supabase/    # Client Supabase (server + browser)
  types/         # Types TypeScript (DB, domain)
```

## Schema DB

```
profiles, artists, songs, chord_sheets, playlists, playlist_songs, chord_votes, favorites
```

Valeurs enum :
- `style`: bringue | himene | variete | traditionnel | autre
- `instrument`: guitare | ukulele | basse | ukulele-bass
- `visibility`: private | link | public

## Regles

- TypeScript strict, zero `any`
- RLS Supabase au niveau DB
- SSR/ISR sur les fiches chansons (SEO)
- Mobile-first
- Pas de sur-ingenierie

## Commandes

```bash
npm run dev    # Dev server
npm run build  # Production build
npm run lint   # ESLint
```

## Conventions

- Composants : PascalCase
- Fichiers utilitaires : camelCase
- Routes : kebab-case
- Commits : conventional commits (fr ok)
