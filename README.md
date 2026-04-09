# Fenua Chords 🎶

Plateforme web communautaire pour partager les accords de chants polynésiens.

## Stack

- **Next.js 16** App Router + TypeScript strict
- **Supabase** — Postgres, Auth magic link, RLS, Storage
- **Tailwind CSS v4** + shadcn/ui
- **Deploy** : Vercel

## Fonctionnalités

- Catalogue de chansons avec recherche et filtres par style
- Fiches d'accords (ChordPro) avec transposition et multi-instruments
- Contribution communautaire avec éditeur visuel (TapToChord + ChordPro)
- Playlists — création, organisation drag & drop, partage QR code, mode lecture plein écran avec auto-scroll
- Système de votes sur les fiches d'accords
- Panel admin (dashboard, gestion utilisateurs/contenu/artistes)
- Profil utilisateur, contributions personnelles
- SEO : SSR/ISR, sitemap

## Développement

```bash
npm run dev    # Serveur de développement
npm run build  # Build production
npm run lint   # ESLint
```

## Structure

```
src/
  app/           # Pages et routes (App Router)
  components/    # Composants React (+ shadcn/ui)
  lib/           # Utilitaires, clients Supabase, validation
  types/         # Types TypeScript
```
