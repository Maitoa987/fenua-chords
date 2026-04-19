# Import Songs — Plan d'implémentation

> **Note :** Le projet n'utilise pas de tests automatisés (cf. CLAUDE.md). Validation manuelle uniquement.

**Goal:** Permettre d'importer des chansons en masse dans Fenua Chords à partir d'une liste de titres, via un skill Claude Code qui génère un JSON et un script Node.js qui l'importe dans Supabase.

**Architecture:** Deux composants découplés. 1) Skill global `~/.claude/skills/import-songs/` qui recherche les accords sur le web et produit `import-output.json`. 2) Script local `scripts/import-to-supabase.ts` qui lit ce JSON et insère dans Supabase via la service role key. Les chansons sont insérées en `status: "draft"` pour validation ultérieure dans l'admin.

**Tech Stack:** TypeScript, `@supabase/supabase-js`, `tsx` (runner), zod (validation), dotenv (via tsx --env-file).

**Spec:** `docs/superpowers/specs/2026-04-15-import-songs-design.md`

---

## Task 1: Ajouter la dépendance `tsx`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Installer tsx en devDependency**

```bash
npm install -D tsx
```

- [ ] **Step 2: Vérifier la présence de tsx dans package.json**

Relire `package.json` : `"tsx"` doit apparaître dans `devDependencies`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: ajouter tsx pour les scripts d'import"
```

---

## Task 2: Créer la structure du dossier `scripts/`

**Files:**
- Create: `scripts/.gitkeep` (si besoin)

- [ ] **Step 1: Créer le dossier scripts à la racine du projet**

```bash
mkdir -p scripts
```

- [ ] **Step 2: Ajouter la variable manquante à `.env.example`**

Si le fichier `.env.example` existe, ajouter ces lignes à la fin :
```
# Pour scripts d'import (ne jamais commiter la vraie valeur)
SUPABASE_SERVICE_ROLE_KEY=
```

Si `.env.example` n'existe pas, sauter cette étape.

- [ ] **Step 3: Commit (si des changements)**

```bash
git add .env.example
git commit -m "chore: documenter SUPABASE_SERVICE_ROLE_KEY pour les scripts"
```

---

## Task 3: Créer le type `ImportEntry` et le validateur Zod

**Files:**
- Create: `scripts/import-types.ts`

- [ ] **Step 1: Créer le fichier `scripts/import-types.ts`**

```typescript
import { z } from "zod"

export const importEntrySchema = z.object({
  title: z.string().trim().min(1).max(200),
  artists: z.array(z.string().trim().min(1).max(100)).min(1),
  style: z.enum(["bringue", "himene", "variete", "traditionnel", "autre"]),
  instrument: z.enum(["guitare", "ukulele", "basse", "ukulele-bass"]),
  originalKey: z.string().max(10).regex(/^([A-G][#b]?m?[0-9]?)?$/).or(z.literal("")),
  capo: z.number().int().min(0).max(12),
  tuning: z.string().max(50).default(""),
  content: z.string().trim().min(1).max(50000),
  source: z.string().url().optional(),
  confidence: z.enum(["high", "medium", "low"]),
})

export const importOutputSchema = z.array(importEntrySchema)

export type ImportEntry = z.infer<typeof importEntrySchema>
```

- [ ] **Step 2: Commit**

```bash
git add scripts/import-types.ts
git commit -m "feat: types et validation des entrées d'import"
```

---

## Task 4: Créer le script principal `import-to-supabase.ts` — squelette et lecture JSON

**Files:**
- Create: `scripts/import-to-supabase.ts`

- [ ] **Step 1: Créer le fichier avec la structure de base**

```typescript
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"
import { importOutputSchema, type ImportEntry } from "./import-types"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Variables d'environnement manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const includeLow = process.argv.includes("--include-low")
const jsonPath = resolve(process.cwd(), "import-output.json")

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

async function main() {
  const raw = readFileSync(jsonPath, "utf-8")
  const parsed = importOutputSchema.safeParse(JSON.parse(raw))

  if (!parsed.success) {
    console.error("❌ import-output.json invalide :")
    console.error(parsed.error.issues)
    process.exit(1)
  }

  const entries = parsed.data
  const toImport = includeLow ? entries : entries.filter((e) => e.confidence !== "low")
  const skipped = entries.length - toImport.length

  console.log(`📦 ${entries.length} entrées trouvées`)
  console.log(`⚠  ${skipped} entrées "low confidence" ignorées${includeLow ? " (flag --include-low ignoré car absent)" : ""}`)
  console.log(`🚀 ${toImport.length} à importer\n`)

  let successCount = 0
  let errorCount = 0

  for (const entry of toImport) {
    try {
      await importEntry(entry)
      successCount++
      console.log(`  ✓ ${entry.title} — ${entry.artists.join(", ")}`)
    } catch (err) {
      errorCount++
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`  ✗ ${entry.title} : ${msg}`)
    }
  }

  console.log(`\n✓ ${successCount} importées | ✗ ${errorCount} erreurs | ⚠ ${skipped} ignorées (low)`)
}

async function importEntry(entry: ImportEntry): Promise<void> {
  throw new Error("non implémenté")
}

main().catch((err) => {
  console.error("❌ Erreur fatale :", err)
  process.exit(1)
})
```

- [ ] **Step 2: Commit**

```bash
git add scripts/import-to-supabase.ts
git commit -m "feat: squelette du script d'import Supabase"
```

---

## Task 5: Implémenter `importEntry` — résolution des artistes

**Files:**
- Modify: `scripts/import-to-supabase.ts`

- [ ] **Step 1: Remplacer le stub `importEntry` par la résolution des artistes**

Remplacer la fonction `importEntry` et ajouter `resolveArtistIds` juste au-dessus :

```typescript
async function resolveArtistIds(names: string[]): Promise<string[]> {
  const ids: string[] = []

  for (const name of names) {
    const artistSlug = slugify(name)

    const { data: existing } = await supabase
      .from("artists")
      .select("id")
      .eq("slug", artistSlug)
      .maybeSingle()

    if (existing) {
      ids.push(existing.id)
      continue
    }

    const { data: created, error } = await supabase
      .from("artists")
      .insert({ name, slug: artistSlug })
      .select("id")
      .single()

    if (error || !created) {
      throw new Error(`Impossible de créer l'artiste "${name}" : ${error?.message ?? "inconnu"}`)
    }
    ids.push(created.id)
  }

  return ids
}

async function importEntry(entry: ImportEntry): Promise<void> {
  const artistIds = await resolveArtistIds(entry.artists)
  throw new Error(`TODO: insert song (artist IDs: ${artistIds.join(", ")})`)
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/import-to-supabase.ts
git commit -m "feat: résolution des artistes (find or create) dans l'import"
```

---

## Task 6: Implémenter l'insertion song + chord_sheet

**Files:**
- Modify: `scripts/import-to-supabase.ts`

- [ ] **Step 1: Remplacer le stub final `importEntry` par l'insertion complète**

Remplacer le corps de `importEntry` (après `const artistIds = ...`) par :

```typescript
async function importEntry(entry: ImportEntry): Promise<void> {
  const artistIds = await resolveArtistIds(entry.artists)

  // Slug de la chanson : "artiste-titre" avec retry en cas de collision
  const firstArtist = entry.artists[0]
  const baseSlug = slugify(`${firstArtist}-${entry.title}`)

  let songId: string | null = null
  let finalSlug: string | null = null

  for (let attempt = 0; attempt < 5; attempt++) {
    const trySlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`
    const { data, error } = await supabase
      .from("songs")
      .insert({
        title: entry.title,
        slug: trySlug,
        style: entry.style,
        original_key: entry.originalKey || null,
        status: "draft",
      })
      .select("id, slug")
      .single()

    if (!error && data) {
      songId = data.id
      finalSlug = data.slug
      break
    }

    const msg = error?.message ?? ""
    if (!msg.includes("unique") && !msg.includes("duplicate")) {
      throw new Error(`Insertion song échouée : ${msg}`)
    }
  }

  if (!songId || !finalSlug) {
    throw new Error("Impossible de générer un slug unique après 5 tentatives")
  }

  // Lier tous les artistes
  const { error: linkError } = await supabase
    .from("song_artists")
    .insert(artistIds.map((artistId) => ({ song_id: songId, artist_id: artistId })))

  if (linkError) {
    throw new Error(`Liaison artistes échouée : ${linkError.message}`)
  }

  // Créer la fiche d'accords
  const { error: sheetError } = await supabase
    .from("chord_sheets")
    .insert({
      song_id: songId,
      instrument: entry.instrument,
      tuning: entry.tuning || null,
      capo: entry.capo || null,
      content: entry.content,
    })

  if (sheetError) {
    throw new Error(`Création chord_sheet échouée : ${sheetError.message}`)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/import-to-supabase.ts
git commit -m "feat: insertion song + chord_sheet dans le script d'import"
```

---

## Task 7: Ajouter le script npm et documenter

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Ajouter l'entrée `import` dans `scripts`**

Dans `package.json`, modifier la section `"scripts"` pour ajouter :

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "import": "tsx --env-file=.env.local scripts/import-to-supabase.ts"
}
```

- [ ] **Step 2: Vérifier la commande à vide**

Sans `import-output.json` à la racine, lancer :
```bash
npm run import
```
Attendu : `❌ Erreur fatale : ENOENT: no such file or directory, open '...import-output.json'`

Cela confirme que le script se lance correctement (tsx + env vars OK) et échoue proprement.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: script npm run import pour charger le JSON dans Supabase"
```

---

## Task 8: Créer le skill `import-songs`

**Files:**
- Create: `~/.claude/skills/import-songs/SKILL.md`

- [ ] **Step 1: Créer le dossier du skill**

```bash
mkdir -p ~/.claude/skills/import-songs
```

- [ ] **Step 2: Écrire le fichier SKILL.md avec ce contenu exact**

````markdown
---
name: import-songs
description: À utiliser quand l'utilisateur veut importer en masse des chansons dans un projet Fenua Chords à partir d'une liste de titres. Lit un fichier texte (un titre par ligne), recherche les accords et infos officielles sur le web pour chaque titre, produit un fichier `import-output.json` au format attendu par le script d'import Supabase. Déclencheurs : "importe des chansons", "ajoute des chansons depuis une liste", "batch import chansons", "import-songs titles.txt".
---

# Skill : import-songs

## Objectif

Transformer une liste de titres de chansons (`titles.txt`) en un fichier JSON (`import-output.json`) contenant pour chaque titre : artistes, style, tonalité, contenu ChordPro, niveau de confiance.

Le JSON généré est ensuite importé dans Supabase via `npm run import` (script séparé).

## Entrée attendue

Un fichier texte avec un titre par ligne. Exemple :

```
Ia Ora O Tahiti Nui
Bora Bora
Tamari'i Volontaires
```

Le chemin du fichier est fourni par l'utilisateur, par défaut `titles.txt` à la racine du projet.

## Sortie à produire

Un fichier `import-output.json` à la racine du projet, contenant un tableau d'entrées au format :

```json
[
  {
    "title": "Titre exact",
    "artists": ["Nom Artiste"],
    "style": "bringue",
    "instrument": "guitare",
    "originalKey": "G",
    "capo": 0,
    "tuning": "",
    "content": "[Verse]\nG   C   D\nParoles...",
    "source": "https://...",
    "confidence": "high"
  }
]
```

### Champs obligatoires

- `title` (string) — titre exact de la chanson, corrigé si trouvé sur la source
- `artists` (string[]) — au moins un artiste (ordre : principal en premier)
- `style` — une des valeurs : `bringue | himene | variete | traditionnel | autre`
- `instrument` — `guitare` par défaut, sinon `ukulele | basse | ukulele-bass`
- `originalKey` (string) — tonalité principale (ex. `G`, `Am`, `C#`), ou `""` si inconnue
- `capo` (number) — position du capo, `0` si aucun
- `tuning` (string) — accordage spécifique, `""` si standard
- `content` (string) — contenu ChordPro (voir section format)
- `confidence` — `high | medium | low` (voir section confiance)

### Champs optionnels

- `source` (string) — URL de la source principale utilisée

## Procédure

Pour chaque titre du fichier d'entrée, exécuter dans l'ordre :

1. **Recherche web** avec WebSearch :
   - Requête 1 : `"<titre>" chords`
   - Requête 2 (si besoin) : `"<titre>" accords guitare`
   - Requête 3 (si besoin) : `"<titre>" ultimate guitar`

2. **Sélection de la meilleure source** (priorité décroissante) :
   - Ultimate Guitar (`tabs.ultimate-guitar.com`)
   - Chordify
   - E-Chords
   - Tout autre site de tablatures crédible

3. **Extraction via WebFetch** de la page choisie pour récupérer :
   - Titre officiel et orthographe exacte
   - Artiste(s) — si plusieurs, les séparer dans le tableau
   - Tonalité originale si indiquée
   - Capo si indiqué
   - Contenu des accords + paroles

4. **Normalisation du contenu en ChordPro** :
   - Accords entre crochets inline avec les paroles quand possible : `[G]Paroles [C]suite`
   - Ou accords sur ligne séparée au-dessus des paroles (acceptable)
   - Sections nommées : `[Verse]`, `[Chorus]`, `[Bridge]`, `[Intro]`, `[Outro]`
   - Conserver les sauts de ligne significatifs

5. **Classification du style** (choisir une seule valeur) :
   - `bringue` — musique festive polynésienne moderne (guitare + ukulélé rythmé)
   - `himene` — chant choral traditionnel
   - `traditionnel` — chants anciens non-himene
   - `variete` — variété française/internationale
   - `autre` — si aucun ne convient

6. **Assignation d'un niveau de confiance** :
   - `high` — source fiable trouvée, artiste et accords cohérents avec le titre
   - `medium` — source trouvée mais ambiguïté (homonymie, version différente, etc.)
   - `low` — recherche infructueuse ou données très partielles (titre seul trouvé sans accords cohérents)

7. **Écriture de l'entrée** dans le tableau final.

## Règles

- **Ne jamais halluciner** un contenu d'accords. Si aucune source fiable n'est trouvée, marquer l'entrée en `confidence: "low"` avec `content` réduit aux paroles sans accords, ou laisser le tableau entier sans cette entrée et signaler à l'utilisateur.
- **Titre exact** : si la source donne une orthographe différente (accents, majuscules), utiliser celle de la source.
- **Artistes multiples** : séparer dans le tableau (ex. `["Bobby", "Angelo Neuffer"]`).
- **Pas de Markdown** dans `content` — format ChordPro brut uniquement.

## Format ChordPro (rappel)

Exemple court et correct :

```
[Intro]
G  C  D  G

[Verse 1]
[G]Tomboy [C]taoto [D]i te [G]po
[G]Ua moe [C]noa to [D]mata [G]here

[Chorus]
[C]Ia ora [G]o Tahiti [D]nu[G]i
```

## Sortie finale

Après traitement de tous les titres, écrire le fichier `import-output.json` à la racine du projet Fenua Chords avec le tableau complet (UTF-8, indenté 2 espaces).

Puis afficher à l'utilisateur :
- Nombre d'entrées `high` / `medium` / `low`
- Liste des titres en `low` avec la raison
- Rappel : `npm run import` pour pousser dans Supabase (ou `npm run import -- --include-low` pour inclure les low).

## Exemple d'invocation

```
User: Utilise le skill import-songs avec titles.txt
```

Ou simplement après avoir mentionné le fichier :

```
User: J'ai mis ma liste dans titles.txt, lance l'import
```
````

- [ ] **Step 3: Vérifier que le skill est détecté**

Dans une nouvelle session Claude Code, le skill `import-songs` doit apparaître dans la liste des skills disponibles.

---

## Task 9: Test manuel end-to-end

**Files:** aucun changement

- [ ] **Step 1: Créer un `titles.txt` avec 2 chansons connues**

```
Ia Ora O Tahiti Nui
Bora Bora
```

- [ ] **Step 2: Invoquer le skill dans Claude Code**

```
Utilise le skill import-songs sur titles.txt
```

Attendu : génération de `import-output.json` avec 2 entrées valides.

- [ ] **Step 3: Relire `import-output.json`**

Vérifier visuellement : titres, artistes, style, contenu ChordPro lisible, `confidence` cohérent.

- [ ] **Step 4: Lancer l'import**

```bash
npm run import
```

Attendu : sortie du type `✓ 2 importées | ✗ 0 erreurs | ⚠ 0 ignorées (low)`.

- [ ] **Step 5: Vérifier dans Supabase**

Via `/admin/contenu` ou directement dans Supabase Studio :
- 2 nouvelles entrées `songs` avec `status = 'draft'`
- Les artistes correspondants créés ou réutilisés
- 2 `chord_sheets` liées
- 2 entrées `song_artists`

- [ ] **Step 6: Nettoyer les données de test**

Supprimer les 2 chansons de test depuis `/admin/contenu` ou SQL.

- [ ] **Step 7: Supprimer les fichiers temporaires**

```bash
rm titles.txt import-output.json
```

Puis vérifier qu'ils ne sont pas commités (ajouter à `.gitignore` si besoin — voir Task 10).

---

## Task 10: Protéger les fichiers temporaires via `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Ajouter les fichiers d'import au `.gitignore`**

Ajouter à la fin de `.gitignore` :

```
# Import de chansons (fichiers locaux temporaires)
titles.txt
import-output.json
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: ignorer titles.txt et import-output.json (fichiers locaux d'import)"
```

---

## Récapitulatif des livrables

| Fichier | Type | Créé en |
|---------|------|---------|
| `package.json` | modif | Task 1, 7 |
| `.env.example` | modif (si existe) | Task 2 |
| `scripts/import-types.ts` | créé | Task 3 |
| `scripts/import-to-supabase.ts` | créé | Task 4, 5, 6 |
| `~/.claude/skills/import-songs/SKILL.md` | créé | Task 8 |
| `.gitignore` | modif | Task 10 |

## Points de vigilance

- **Service role key** : ne jamais la commiter. Elle bypass RLS — à traiter comme un secret.
- **Slugs** : la logique de slug doit rester identique à `src/lib/slugify.ts` pour éviter les divergences.
- **Statut draft** : garantit qu'aucune chanson d'import n'est publiée automatiquement — validation humaine requise via `/admin/contenu`.
- **Rate limiting** : le script bypass le rate limit (service role) — à utiliser avec parcimonie, ne pas enchaîner des milliers d'entrées sans surveiller la DB.
