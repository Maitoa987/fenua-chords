# Design : Import de chansons par liste de titres

**Date :** 2026-04-15  
**Statut :** Approuvé

## Résumé

Système en deux étapes pour importer des chansons en masse dans Fenua Chords :
1. Un skill Claude Code qui recherche les accords sur le web à partir d'une liste de titres et génère un fichier JSON à valider.
2. Un script TypeScript qui importe le JSON validé dans Supabase.

## Workflow

```
titles.txt
  → skill import-songs  →  import-output.json  (validation manuelle)
  → npm run import      →  Supabase DB (statut draft)
```

## Composant 1 — Skill `import-songs`

### Déclenchement

Invoqué dans Claude Code :
```
Skill("import-songs", "titles.txt")
```

### Comportement

Pour chaque titre dans `titles.txt` (un titre par ligne) :

1. Recherche web avec les requêtes `"[titre] chords"` et `"[titre] accords guitare"`
2. Source prioritaire : Ultimate Guitar, puis Chordify, E-Chords, ou toute source pertinente
3. Extraction des données : titre exact, artiste(s), tonalité originale, capo, style, contenu en ChordPro
4. Attribution d'un niveau de confiance : `high` (correspondance certaine), `medium` (probable), `low` (incertaine)
5. Écriture dans `import-output.json` à la racine du projet

### Format de sortie `import-output.json`

```json
[
  {
    "title": "Ti Amo",
    "artists": ["Vaite"],
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

**Valeurs enum :**
- `style` : `bringue | himene | variete | traditionnel | autre`
- `instrument` : `guitare | ukulele | basse | ukulele-bass`
- `confidence` : `high | medium | low`

### Validation manuelle

Après génération, l'utilisateur relit `import-output.json`, corrige ou supprime des entrées, puis lance le script d'import.

---

## Composant 2 — Script `scripts/import-to-supabase.ts`

### Commande

```bash
npx tsx scripts/import-to-supabase.ts
# inclure les entrées low confidence
npx tsx scripts/import-to-supabase.ts --include-low
```

### Prérequis

- `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local`
- `import-output.json` présent à la racine

### Comportement

1. Lit `import-output.json`
2. Filtre les entrées `confidence: "low"` sauf si flag `--include-low`
3. Pour chaque chanson :
   - Résout ou crée les artistes (slug + retry sur collision, identique à `contribuer/page.tsx`)
   - Insère la song avec `status: "draft"`
   - Insère le chord_sheet lié
4. Affiche un résumé :
   ```
   ✓ 12 importées | ✗ 2 erreurs | ⚠ 3 low confidence ignorées
   ```

### Statut des chansons importées

Toutes les chansons sont insérées en `draft`. La publication se fait manuellement depuis `/admin/contenu`.

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `~/.claude/skills/import-songs/SKILL.md` | Skill Claude Code (global, disponible dans tous les projets) |
| `scripts/import-to-supabase.ts` | Script d'import Supabase |

## Dépendances

- `tsx` à ajouter en devDependency : `npm install -D tsx`

## Fichiers non modifiés

- Aucune modification de l'app Next.js
- Aucune modification du schéma DB

---

## Hors périmètre

- Déduplication si le titre existe déjà (à gérer manuellement dans le JSON)
- Support de formats d'entrée autres que `.txt`
- Interface admin pour l'import (workflow CLI uniquement)
