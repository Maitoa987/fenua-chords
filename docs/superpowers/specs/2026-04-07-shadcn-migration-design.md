# Fenua Chords — Migration shadcn/ui

> Remplacer les composants UI custom par shadcn/ui pour une meilleure coherence et maintenabilite.

---

## Contexte

Le projet utilise actuellement des composants HTML natifs (button, input, select, textarea) styles avec Tailwind. L'objectif est de migrer vers shadcn/ui pour beneficier de composants accessibles, coherents et maintenables.

**Stack actuelle** : Next.js 16, Tailwind CSS v4, TypeScript strict
**Approche** : installer shadcn, configurer pour Tailwind v4, migrer fichier par fichier

---

## Composants shadcn a installer (13)

| Composant | Remplace | Fichiers impactes |
|-----------|----------|-------------------|
| Button | Tous les boutons et liens-boutons | Header, MobileMenu, Landing, Login, Contribuer, Edit, TransposeControls, ChordEditor, ChordPicker, 404, Error |
| Input | Inputs text/email/password | SearchBar, SongForm, Login, ChordPicker, Edit |
| Select | Selects natifs HTML | SongForm (style, instrument, key, capo), Edit |
| Textarea | Textareas lyrics et ChordPro | ChordEditor, ChordProTextarea |
| Badge | StyleBadge pills colorees | StyleBadge, SongCard, pages chansons |
| Card | Cards artistes, chansons, stats | SongCard, ArtistCard, Landing stats |
| Sheet | ChordPicker bottom sheet overlay | ChordPicker |
| Command | ArtistAutocomplete combobox | ArtistAutocomplete |
| Tabs | Mode toggle, auth tabs, sheet selector | ChordEditor, Login, SongDetailClient |
| Alert | Messages erreur/succes | Login, Contribuer, Edit |
| Skeleton | Loading states | chansons/loading, artistes/loading |
| Label | Labels de formulaire | SongForm, Login, Edit |
| Separator | Bordures entre sections | Header, Footer |

## Composants custom conserves

| Composant | Raison |
|-----------|--------|
| ChordRenderer | Rendu specifique accords/paroles, aucun equivalent shadcn |
| TapToChord | Interface tap-to-place unique |
| ChordPreview | Wrapper fin autour de ChordRenderer |
| Header/Footer | Layout custom, boutons internes migreront vers shadcn Button |
| TransposeControls | Layout specifique, mais utilisera shadcn Button |

---

## Configuration shadcn

### Initialisation

```bash
npx shadcn@latest init
```

Options :
- Style : Default
- Base color : Slate (on override avec notre palette)
- CSS variables : Yes
- Tailwind CSS v4 : Yes (shadcn supporte v4 nativement)

### Palette custom

Conserver la palette "Lagon & Terre" existante. Mapper les CSS variables shadcn sur nos couleurs :

```
--primary: #0D9488 (teal ocean)
--primary-foreground: #FFFFFF
--secondary: #14B8A6 (teal clair)
--accent: #F97316 (orange CTA)
--background: #F0FDFA (ecume)
--card: #FFFFFF (surface)
--foreground: #134E4A (text)
--muted-foreground: #475569 (text-muted)
--destructive: #EF4444 (erreurs)
--border: rgba(13, 148, 136, 0.1) (primary/10)
--ring: #0D9488 (focus ring)
```

### Fonts

Conserver Varela Round (headings) + Nunito Sans (body) + Geist Mono (accords). Pas de changement.

---

## Plan de migration par etape

### Etape 1 — Setup shadcn + composants de base [S]

1. Initialiser shadcn (CLI)
2. Configurer la palette custom dans globals.css
3. Installer : Button, Input, Textarea, Label, Separator, Badge, Skeleton
4. Verifier build

### Etape 2 — Formulaires et selects [S]

1. Installer : Select, Alert
2. Migrer SongForm (inputs, selects, labels)
3. Migrer Login page (inputs, alerts, boutons)
4. Migrer Edit page (inputs, selects)
5. Migrer SearchBar (Input)

### Etape 3 — Cards et layout [S]

1. Installer : Card
2. Migrer SongCard
3. Migrer ArtistCard
4. Migrer Landing page (stat cards, boutons)
5. Migrer pages erreur (404, 500)

### Etape 4 — Composants complexes [M]

1. Installer : Sheet, Command, Tabs
2. Migrer ChordPicker → shadcn Sheet
3. Migrer ArtistAutocomplete → shadcn Command (combobox)
4. Migrer ChordEditor mode toggle → shadcn Tabs
5. Migrer Login auth tabs → shadcn Tabs
6. Migrer SongDetailClient sheet selector → shadcn Tabs

### Etape 5 — Navigation et loading [XS]

1. Migrer Header/MobileMenu (boutons internes vers shadcn Button)
2. Migrer loading skeletons → shadcn Skeleton
3. Migrer StyleBadge → shadcn Badge
4. Build + lint final

---

## Regles de migration

- Un fichier a la fois, build apres chaque modification
- Conserver la meme structure de fichiers
- Ne pas changer les props des composants parents (API stable)
- Les composants shadcn vont dans `src/components/ui/` (convention shadcn)
- Conserver les couleurs custom via les CSS variables shadcn
- Ne pas ajouter de dark mode (hors scope)

---

## Decisions

| Decision | Choix | Raison |
|----------|-------|--------|
| shadcn vs autre lib | shadcn | Composants accessibles, pas de runtime, Tailwind natif |
| Migration incrementale | Oui, par etape | Eviter le big bang, build stable a chaque etape |
| Dark mode | Non | Hors scope MVP |
| Palette | Conserver "Lagon & Terre" | Identite visuelle validee |
| MobileMenu | Garder custom | Comportement simple, Sheet serait over-engineered |
