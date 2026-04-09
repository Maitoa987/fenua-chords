# Spec : Correctifs UI/UX Responsive — Fenua Chords

**Date** : 2026-04-08
**Origine** : Audit UI/UX responsive complet (42 problemes identifies)
**Decisions prises** :
- Option B — augmenter les tailles Button globalement (pas de variante `touch` separee)
- Option A — extraire un composant partage `ReaderToolbar` pour les 2 readers

---

## 1. Button : augmentation globale des tailles

**Fichier** : `src/components/ui/button.tsx`

Modifier les variantes `size` existantes :

| Variante | Avant | Apres | Delta |
|----------|-------|-------|-------|
| `xs` | `h-6` (24px) | `h-8` (32px) | +8px |
| `sm` | `h-7` (28px) | `h-9` (36px) | +8px |
| `default` | `h-8` (32px) | `h-10` (40px) | +8px |
| `lg` | `h-9` (36px) | `h-11` (44px) | +8px |
| `icon` | `size-8` (32px) | `size-10` (40px) | +8px |
| `icon-xs` | `size-6` (24px) | `size-8` (32px) | +8px |
| `icon-sm` | `size-7` (28px) | `size-9` (36px) | +8px |
| `icon-lg` | `size-9` (36px) | `size-11` (44px) | +8px |

**Principe** : +8px (0.5rem) sur chaque variante. Le `lg` atteint 44px (seuil WCAG).

**Impact** : Toutes les pages sont affectees. Verifier visuellement apres le changement :
- Header (menu button)
- Admin (boutons d'action dans les listes)
- Formulaires (submit buttons)
- Playlist manager (boutons action)

---

## 2. ReaderToolbar — composant partage

**Nouveau fichier** : `src/components/ReaderToolbar.tsx`

Extrait la barre de controles commune aux 2 readers :
- `SongReaderModal.tsx` (lignes 144-202)
- `PlaylistReaderClient.tsx` (lignes 201-281)

### Props

```ts
interface ReaderToolbarProps {
  // Titre
  title: string
  subtitle?: string            // artiste ou nom playlist
  badge?: string               // "2/5" pour playlist

  // Font size
  fontSizeIndex: number
  fontSizes: number[]
  onFontChange: (delta: number) => void

  // Transpose
  semitones: number
  onSemitonesChange: (semitones: number) => void
  originalKey?: string | null

  // Auto-scroll
  scrolling: boolean
  onToggleScroll: () => void
  speedIndex: number
  speedLabels: string[]
  onSpeedChange: (delta: number) => void

  // Close
  onClose: () => void
}
```

### Layout responsive

**Desktop (sm+)** : 1 rangee, tous les controles en ligne (layout actuel).

**Mobile (<sm)** : 2 rangees.
- **Rangee 1** : titre (truncate) + bouton fermer
- **Rangee 2** : font size | transpose | auto-scroll (icones seules, pas de labels texte)

Implementation via flexbox + `flex-wrap` avec un `order` CSS :
- Le bouton fermer est `order-first` sur mobile pour rester sur la premiere ligne
- Les controles passent en `w-full` sous `sm:` pour forcer le retour a la ligne

### Touch targets

Tous les boutons de la toolbar utilisent `min-h-[44px] min-w-[44px]` en inline style ou classe utilitaire. Les labels texte (`text-[10px]`) passent a `text-xs` (12px min).

### Safe areas iOS

Sur le container `fixed inset-0` du reader :
```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

Ajouter dans `globals.css` :
```css
@supports (padding: env(safe-area-inset-top)) {
  .reader-safe-area {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

### Refactoring des readers

- `SongReaderModal.tsx` : supprime la toolbar inline, utilise `<ReaderToolbar />`
- `PlaylistReaderClient.tsx` : supprime la toolbar inline, utilise `<ReaderToolbar />`
- La bottom nav du PlaylistReader reste specifique (prev/next chanson)

---

## 3. Viewport meta

**Fichier** : `src/app/layout.tsx`

Ajouter l'export viewport Next.js :

```ts
import type { Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',   // pour env(safe-area-inset-*)
}
```

---

## 4. ChordRenderer responsive

**Fichier** : `src/components/ChordRenderer.tsx`

### Problemes actuels
- `whitespace-pre-wrap` + `text-base` deborde sur 320px
- Positionnement absolu des accords casse quand le texte wrap

### Corrections
- Ajouter `overflow-wrap: break-word` sur le container principal (evite le debordement)
- Le font-size est deja controle dynamiquement dans le reader (via `style={{ fontSize }}`). Sur la page detail, ajouter une classe responsive : `text-sm md:text-base` au lieu de `text-base` fixe
- Dans `SongDetailClient.tsx:136` : remplacer `overflow-x-auto` par `overflow-x-hidden overflow-wrap-anywhere` pour eviter le scroll horizontal visible

---

## 5. ProfileForm responsive

**Fichier** : `src/app/profil/ProfileForm.tsx`

| Ligne | Probleme | Fix |
|-------|----------|-----|
| 103 | `grid grid-cols-2` | `grid grid-cols-1 sm:grid-cols-2` |
| 137 | `<Button>` sans `w-full` | Ajouter `className="w-full sm:w-auto"` |

---

## 6. ChordPicker grid responsive

**Fichier** : `src/components/chord-editor/ChordPicker.tsx`

| Ligne | Probleme | Fix |
|-------|----------|-----|
| 94 | `grid grid-cols-7` | `grid grid-cols-4 sm:grid-cols-7` |

---

## 7. Admin layout nav responsive

**Fichier** : `src/app/admin/layout.tsx`

| Ligne | Probleme | Fix |
|-------|----------|-----|
| 15 | `flex gap-2` sans wrap | `flex flex-wrap gap-2` |

---

## 8. Admin EditArtistButton responsive

**Fichier** : `src/app/admin/artistes/EditArtistButton.tsx`

| Ligne | Probleme | Fix |
|-------|----------|-----|
| 41 | `flex items-center gap-2` | `flex flex-col sm:flex-row items-stretch sm:items-center gap-2` |
| 55-60 | Boutons check/X sans aria-label | Ajouter `aria-label="Enregistrer"` / `aria-label="Annuler"` |

---

## 9. Playlist drag activation constraint

**Fichier** : `src/app/playlists/PlaylistManagerClient.tsx`

| Ligne | Probleme | Fix |
|-------|----------|-----|
| 120 | `useSensor(PointerSensor)` | `useSensor(PointerSensor, { activationConstraint: { distance: 8 } })` |
| 99-105 | Bouton trash `p-1` trop petit | Utiliser `<Button variant="ghost" size="icon">` avec aria-label |

---

## 10. Playlist reader aria-labels

**Fichier** : a traiter dans `ReaderToolbar.tsx` (nouveau composant)

Tous les boutons du toolbar auront des `aria-label` explicites :
- Font A- : `aria-label="Reduire la taille du texte"`
- Font A+ : `aria-label="Agrandir la taille du texte"`
- Transpose - : `aria-label="Baisser d'un demi-ton"`
- Transpose + : `aria-label="Monter d'un demi-ton"`
- Speed - : `aria-label="Ralentir le defilement"`
- Speed + : `aria-label="Accelerer le defilement"`
- Play/Pause : `aria-label="Lancer/Pause auto-scroll"`
- Close : `aria-label="Quitter le mode lecture"`

---

## 11. TransposeControls responsive

**Fichier** : `src/components/TransposeControls.tsx`

| Ligne | Probleme | Fix |
|-------|----------|-----|
| 37 | `min-w-[140px]` select | `min-w-[100px] sm:min-w-[140px]` |
| 37 | `focus:` au lieu de `focus-visible:` | Changer en `focus-visible:` |

---

## 12. Corrections mineures

### Homepage hero text (page.tsx:37)
`text-5xl sm:text-6xl` → `text-3xl sm:text-5xl lg:text-6xl`

### Mes contributions header (mes-contributions/page.tsx:48)
`flex items-center justify-between` → `flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`

### SearchBar aria-label (SearchBar.tsx:31)
Ajouter `aria-label="Rechercher un chant ou artiste"` sur l'input.

### PlaylistShareModal QR responsive (PlaylistShareModal.tsx:111)
`<QRCodeSVG value={shareUrl} size={200} />` → wrapper avec `max-w-[200px] w-full aspect-square` et `size` dynamique.

### SongDetailClient metadata gap (SongDetailClient.tsx:85)
`gap-x-6` → `gap-x-3 sm:gap-x-6`

---

## 13. Loading skeletons manquants

Creer des `loading.tsx` minimaux pour :
- `src/app/chansons/[slug]/loading.tsx` — skeleton titre + metadata + bloc accords
- `src/app/playlists/loading.tsx` — skeleton titre + liste chansons
- `src/app/artistes/[slug]/loading.tsx` — skeleton avatar + titre + liste chansons
- `src/app/admin/loading.tsx` — skeleton stats + liste

Chaque skeleton reutilise le composant `Skeleton` de shadcn/ui, avec le meme layout que la page reelle pour eviter le CLS.

---

## 14. globals.css — safe areas + focus

**Fichier** : `src/app/globals.css`

Ajouts :
```css
/* Safe area for fullscreen readers */
@supports (padding: env(safe-area-inset-top)) {
  .reader-safe-area {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

---

## Fichiers impactes (resume)

| Fichier | Type de changement |
|---------|-------------------|
| `src/components/ui/button.tsx` | Modifier tailles |
| `src/components/ReaderToolbar.tsx` | **Nouveau** |
| `src/components/SongReaderModal.tsx` | Refactor toolbar → ReaderToolbar |
| `src/app/playlists/[shareToken]/lecture/PlaylistReaderClient.tsx` | Refactor toolbar → ReaderToolbar |
| `src/app/layout.tsx` | Ajouter viewport export |
| `src/app/globals.css` | Safe areas CSS |
| `src/components/ChordRenderer.tsx` | Overflow fix |
| `src/app/chansons/[slug]/SongDetailClient.tsx` | Overflow fix + gap |
| `src/app/profil/ProfileForm.tsx` | Grid + bouton responsive |
| `src/components/chord-editor/ChordPicker.tsx` | Grid responsive |
| `src/app/admin/layout.tsx` | Nav flex-wrap |
| `src/app/admin/artistes/EditArtistButton.tsx` | Layout + aria |
| `src/app/playlists/PlaylistManagerClient.tsx` | Drag constraint + trash button |
| `src/components/TransposeControls.tsx` | Select responsive + focus |
| `src/app/page.tsx` | Hero text responsive |
| `src/app/mes-contributions/page.tsx` | Header responsive |
| `src/components/SearchBar.tsx` | Aria-label |
| `src/components/PlaylistShareModal.tsx` | QR responsive |
| `src/app/chansons/[slug]/loading.tsx` | **Nouveau** |
| `src/app/playlists/loading.tsx` | **Nouveau** |
| `src/app/artistes/[slug]/loading.tsx` | **Nouveau** |
| `src/app/admin/loading.tsx` | **Nouveau** |

---

## Hors perimetre

- Systeme de toast/notifications (feature separee)
- Auto-scroll intelligent (distinction touch intentionnel vs accidentel — UX complexe, iteration future)
- Dark mode (pas implemente actuellement)
- Pagination songs/artistes (dataset encore petit)
