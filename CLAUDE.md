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
  app/              # App Router pages et layouts
    admin/          #   Panel admin (dashboard, users, contenu, artistes)
    artistes/       #   Pages artistes (liste, detail)
    chansons/       #   Pages chansons (catalogue, detail, edit)
    connexion/      #   Auth (login magic link)
    contribuer/     #   Formulaire contribution
    mes-contributions/ # Contributions de l'utilisateur
    playlists/      #   Playlist perso, vue partagee, mode lecture
    profil/         #   Page profil utilisateur
    api/            #   API routes (admin, verify-turnstile)
  components/       # Composants React reutilisables
    chord-editor/   #   Editeur d'accords (ChordPro, TapToChord)
    ui/             #   Composants shadcn/ui
  lib/              # Utilitaires, clients, helpers
    supabase/       #   Client Supabase (server + browser)
  types/            # Types TypeScript (DB, domain)
```

## Schema DB

```
profiles, artists, songs, chord_sheets, playlists, playlist_songs, playlist_follows, chord_votes, favorites
```

Valeurs enum :
- `style`: bringue | himene | variete | traditionnel | autre
- `instrument`: guitare | ukulele | basse | ukulele-bass
- `visibility`: private | link | public
- `role`: user | admin
- `song_status`: draft | published
- `vote_value`: 1 | -1

## Regles

- TypeScript strict, zero `any`
- RLS Supabase au niveau DB
- SSR/ISR sur les fiches chansons (SEO)
- Mobile-first
- Pas de sur-ingenierie
- Validation Zod sur tous les formulaires (contribute, edit)
- Cloudflare Turnstile captcha sur signup et contribute
- Rate limiting via Supabase RPC (10 songs/hour/user)
- Systeme admin : role-based (admin guard), ban/unban utilisateurs

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
