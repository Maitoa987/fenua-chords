# Fenua Chords — Design Spec MVP

> Plateforme communautaire pour partager les accords de chants polynesiens.

---

## Contexte

- **Public cible** : grand public polynesien (pas uniquement musiciens)
- **Modele de contenu** : contribution ouverte des le jour 1, pas de moderation
- **Auth** : magic link email + email/password (Supabase Auth)
- **Objectif** : parcourir, chercher, voir les accords, contribuer
- **Timing** : pas de deadline, on fait bien les choses
- **Hors MVP** : playlists, favoris, votes, profils publics

---

## Stack

- Next.js 16 App Router + TypeScript strict
- Supabase (Postgres + Auth + RLS)
- Tailwind CSS v4
- Deploy : Vercel

---

## Design System

### Palette — "Lagon & Terre"

| Role | Couleur | Hex | Usage |
|------|---------|-----|-------|
| Primary | Teal ocean | `#0D9488` | Nav, liens, titres actifs |
| Secondary | Teal clair | `#14B8A6` | Hover, badges, accents |
| CTA | Orange chaud | `#F97316` | Boutons "Contribuer", actions principales |
| Background | Ecume | `#F0FDFA` | Fond de page principal |
| Surface | Blanc | `#FFFFFF` | Cards, modals |
| Text | Vert profond | `#134E4A` | Texte principal |
| Text muted | Slate | `#475569` | Texte secondaire |
| Chord | Orange CTA | `#F97316` | Accords au-dessus des paroles |

### Typographie

| Role | Font | Raison |
|------|------|--------|
| Headings | Varela Round | Arrondie, chaleureuse, accueillante |
| Body | Nunito Sans | Tres lisible, friendly, poids multiples |
| Accords | Geist Mono | Deja dans le projet, alignement accords |

### Regles UX

- Touch targets min 44x44px
- Transitions 150-300ms sur hover/tap
- Focus rings 3px `#0D9488`
- `prefers-reduced-motion` respecte
- Icones : Lucide Icons (pas d'emojis)
- Body text min 16px sur mobile
- Contraste WCAG AA minimum

---

## Architecture

### Tables DB (MVP)

| Table | Role |
|-------|------|
| `profiles` | Cree automatiquement au signup via trigger |
| `artists` | Catalogue artistes avec slug SEO |
| `songs` | Chansons liees a un artiste, slug, style, status |
| `chord_sheets` | Fiches accords en ChordPro, liees a chanson + contributeur |

### RLS

- Lecture publique : `artists`, `songs`, `chord_sheets` (ou `status = 'published'`)
- Ecriture : users authentifies uniquement
- Edition/suppression : `contributed_by = auth.uid()` (chord_sheets), `created_by = auth.uid()` (songs)

### Routes

```
/                          Landing page
/artistes                  Liste artistes (SSR)
/artistes/[slug]           Page artiste + ses chansons (SSR)
/chansons                  Liste/recherche chansons (SSR)
/chansons/[slug]           Fiche chanson + accords (ISR)
/contribuer                Formulaire ajout chanson + editeur (auth required)
/contribuer/[id]/edit      Edition fiche existante (auth required)
/connexion                 Login (magic link + email/password)
/callback                  Auth callback Supabase
```

### Layout

```
Header : Logo + Nav (Artistes, Chansons) + CTA Contribuer (orange) + Login/Avatar
         Mobile : hamburger menu
Footer : Fenua Chords (c) 2026
```

### Composants cles

| Composant | Description |
|-----------|------------|
| `Header` | Logo + nav + CTA Contribuer + avatar/login |
| `SongCard` | Card : titre, artiste, style badge, instrument icon |
| `ArtistCard` | Nom, origine, nombre de chansons |
| `ChordRenderer` | Parse ChordPro → accords au-dessus des paroles |
| `ChordEditor` | Container tap-to-chord / ChordPro (voir spec editeur) |
| `ChordPicker` | Bottom-sheet mobile, grille accords, 44x44px targets |
| `SearchBar` | Recherche titre/artiste, resultats dropdown |
| `StyleBadge` | Badge colore par style musical |

---

## Roadmap MVP — Approche Outside-In

### Etape 1 — Fondations [S]

**Objectif** : DB + Auth + Layout + Design system en place.

- Creer le projet Supabase + configurer env vars
- Migrations SQL : tables `profiles`, `artists`, `songs`, `chord_sheets` + RLS + trigger auth
- Seed data : 5-10 chansons en ChordPro
- Layout global : Header (nav + CTA) + Footer
- Setup fonts (Varela Round + Nunito Sans) + palette Tailwind
- Page `/connexion` : magic link + email/password
- Callback auth `/callback`

**Livrable** : on peut se connecter, le layout est en place, la DB est peuplee.

### Etape 2 — Browse & Decouverte [S]

**Objectif** : navigation dans le catalogue.

- `/artistes` : liste artistes (SSR), cards avec nom + origine + nb chansons
- `/artistes/[slug]` : page artiste avec bio + liste chansons
- `/chansons` : liste chansons (SSR), filtres par style + instrument
- `SearchBar` : recherche par titre ou artiste (query Supabase `ilike`)
- `StyleBadge` : badges colores par style musical

**Livrable** : on peut parcourir et chercher des chansons/artistes.

### Etape 3 — Fiche Chanson + Rendu Accords [M]

**Objectif** : la page coeur du produit.

- `/chansons/[slug]` : page chanson ISR avec meta tags SEO
- `ChordRenderer` : parse ChordPro → rendu accords au-dessus des paroles
- Transposition cote client (+/- demi-ton, dropdown tonalite)
- Selecteur de fiche si plusieurs chord_sheets pour la meme chanson
- Infos : artiste, style, tonalite, capo, instrument, contributeur
- Responsive : accords wrappent proprement sur mobile
- `generateMetadata` : titre, description, Open Graph

**Livrable** : on peut voir une chanson avec ses accords, transposer, page indexable Google.

### Etape 4 — Editeur d'accords [L]

**Objectif** : feature la plus complexe — spec dediee dans `docs/spec-chord-editor.md`.

- `/contribuer` : formulaire de soumission (titre, artiste, style, instrument...)
- Creation d'artiste a la volee si inexistant
- `ChordEditor` : container avec toggle mode simple/texte
- `TapToChord` : saisie paroles → placement accords par tap
- `ChordPicker` : bottom-sheet avec grille accords + champ custom + recents
- `ChordProTextarea` : mode texte avec preview live
- Switch entre modes sans perte de donnees
- Preview avant soumission
- `/contribuer/[id]/edit` : edition fiche existante (auteur uniquement)

**Livrable** : un utilisateur connecte peut contribuer une fiche accords complete.

### Etape 5 — Landing Page [XS]

**Objectif** : remplacer le placeholder par une vraie page d'accueil.

- Hero : value prop + CTA "Explorer les chants" / "Contribuer"
- Section : chansons recentes ou populaires
- Section : styles musicaux (bringue, himene...) comme categories cliquables
- Compteurs communautaires (nombre chansons, contributeurs)

**Livrable** : la page d'accueil donne envie d'explorer et de contribuer.

### Etape 6 — Polish & Deploy [S]

**Objectif** : pret pour la production.

- Pages d'erreur (404, 500)
- Loading states (skeletons)
- Sitemap XML dynamique
- Verifier build production (`npm run build` sans erreur)
- Deploy Vercel + variables d'environnement
- Test manuel parcours complet : arriver → chercher → voir accords → s'inscrire → contribuer

**Livrable** : MVP en production, utilisable.

### Vue d'ensemble

```
Etape 1 --> Etape 2 --> Etape 3 --> Etape 4 --> Etape 5 --> Etape 6
Fondations   Browse      Fiche       Editeur     Landing     Deploy
   [S]        [S]        [M]          [L]         [XS]        [S]
```

---

## Spec complementaire

L'editeur d'accords dispose de sa propre spec detaillee : `docs/spec-chord-editor.md`.
Elle couvre le format ChordPro, les modes tap-to-chord et texte, le picker, la transposition, et les criteres d'acceptation.

---

## Decisions prises

| Decision | Choix | Raison |
|----------|-------|--------|
| Approche roadmap | Outside-in (UI d'abord) | Voir le produit prendre forme tot, coder le rendu avant l'editeur |
| Auth | Magic link + email/password | Supabase natif, pas de complexite |
| Moderation | Aucune en V1 | Contribution ouverte, on ajoutera si abus |
| Format accords | ChordPro | Standard, parsable, transposable |
| Editeur mobile | Bottom-sheet partout | Mobile-first, coherent |
| Hors MVP | Playlists, favoris, votes, profils publics | YAGNI, on ajoute quand le catalogue existe |
