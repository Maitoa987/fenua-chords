# Refonte UX TransposeControls — Sélecteur de tonalité

## Contexte

Les contrôles de transposition actuels affichent `[-] 0 [+]` avec un offset en demi-tons. Le public cible (joueurs occasionnels en soirée bringue) ne comprend pas ce que "+3" signifie. On veut remplacer ça par un sélecteur de tonalité cible quand `originalKey` est disponible.

## Fichiers à modifier

1. `src/lib/transpose.ts` — ajouter `getSemitonesBetween()`
2. `src/components/TransposeControls.tsx` — refonte complète du composant
3. `src/app/chansons/[slug]/SongDetailClient.tsx` — adapter l'intégration (props inchangées normalement)
4. `src/app/playlists/[shareToken]/lecture/PlaylistReaderClient.tsx` — adapter les contrôles inline du mode lecture

## Tâche 1 — `src/lib/transpose.ts`

Ajouter une fonction exportée :

```ts
export function getSemitonesBetween(from: string, to: string): number
```

- Parse `from` et `to` avec `parseChord()` (déjà existante, la rendre exportée ou extraire la logique)
- Retourne le nombre de demi-tons (0-11) pour aller de `from` à `to` en montant
- Exemples : `getSemitonesBetween("C", "E")` → 4, `getSemitonesBetween("Am", "Cm")` → 3

Ajouter aussi :

```ts
export function getAllKeys(originalKey: string): string[]
```

- Si `originalKey` est mineur (contient "m" mais pas "maj"), retourne les 12 tonalités mineures : `["Am", "A#m", "Bm", "Cm", ...]`
- Si majeur, retourne les 12 tonalités majeures : `["C", "C#", "D", ...]`
- L'ordre doit commencer à C/Am (ordre chromatique standard)
- Utiliser les dièses par défaut, sauf si `originalKey` contient un bémol (ex: `Bb` → la liste utilise les bémols)

## Tâche 2 — `src/components/TransposeControls.tsx`

Refondre le composant. L'interface publique reste :

```ts
interface TransposeControlsProps {
  semitones: number
  onChange: (semitones: number) => void
  originalKey?: string
}
```

### Cas 1 : `originalKey` fournie

Afficher :

```
Tonalité : [dropdown ▾]        (Original : Am)
```

- Le dropdown (`<select>`) liste les 12 tonalités via `getAllKeys(originalKey)`
- La valeur sélectionnée = `getTransposedKey(originalKey, semitones)`
- Au changement du dropdown, calculer le delta via `getSemitonesBetween(originalKey, selectedKey)` et appeler `onChange(delta)`
- Le label "(Original)" apparaît à côté de la tonalité originale dans le dropdown
- Garder les boutons +/- à côté du dropdown comme raccourci secondaire (plus petits, `variant="ghost"`, `h-8 w-8`)

### Cas 2 : `originalKey` absente

Garder le design actuel avec les boutons +/- mais remplacer l'affichage numérique :
- Au lieu de "+3", afficher par exemple "3 ↑" ou "2 ↓" (flèches pour indiquer la direction)
- Ajouter un `title` tooltip : "3 demi-tons plus haut"

### Contraintes UI

- Mobile-first : le dropdown doit être facilement tappable (`h-10 min-w-[140px]`)
- `touch-manipulation` sur tous les éléments interactifs
- Style cohérent avec le reste : `text-chord` pour la tonalité active, `text-muted-foreground` pour les labels
- Les boutons +/- ont besoin de `aria-label` en français

## Tâche 3 — `PlaylistReaderClient.tsx`

Le mode lecture playlist a ses propres contrôles inline (lignes ~220-230). Adapter :

- Si `song.original_key` est dispo, remplacer les boutons +/- inline par un mini-select compact
- Si pas de `original_key`, garder les boutons +/- actuels avec le même tweak d'affichage (flèches au lieu du chiffre brut)
- Attention : ce composant gère le reset à 0 au changement de chanson (ligne ~166), ne pas casser ce comportement
- Le select en mode lecture doit être encore plus compact (contexte fullscreen, barre d'outils minimale)

## Tâche 4 — Vérification

- `npm run build` doit passer sans erreur
- Vérifier que le reset à 0 fonctionne toujours au changement d'onglet instrument (SongDetailClient) et au changement de chanson (PlaylistReaderClient)
- Pas de `any` dans le code ajouté

## Ce qui NE change PAS

- `transposeChordPro()` — l'API interne reste basée sur les demi-tons
- `ChordRenderer` — aucun changement
- Le state `semitones` dans les composants parents — le contrat `onChange(semitones: number)` est préservé
- La DB — rien à migrer
