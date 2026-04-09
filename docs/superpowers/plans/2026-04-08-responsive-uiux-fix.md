# Correctifs UI/UX Responsive — Plan d'implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les 42 problemes UI/UX responsive identifies dans l'audit, couvrant touch targets, toolbar reader, safe areas iOS, et corrections mineures.

**Architecture:** Approche bottom-up — on commence par les fondations (button sizes, viewport, CSS global), puis les composants partages (ReaderToolbar, ChordRenderer), puis les pages individuelles, et enfin les loading skeletons.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui, TypeScript strict

**Spec:** `docs/superpowers/specs/2026-04-08-responsive-uiux-fix-design.md`

---

## File Structure

| Fichier | Action | Responsabilite |
|---------|--------|----------------|
| `src/components/ui/button.tsx` | Modify | Augmenter toutes les tailles de +8px |
| `src/app/layout.tsx` | Modify | Ajouter export viewport |
| `src/app/globals.css` | Modify | Safe areas CSS |
| `src/components/ReaderToolbar.tsx` | **Create** | Toolbar partagee pour les 2 readers |
| `src/components/SongReaderModal.tsx` | Modify | Utiliser ReaderToolbar |
| `src/app/playlists/[shareToken]/lecture/PlaylistReaderClient.tsx` | Modify | Utiliser ReaderToolbar |
| `src/components/ChordRenderer.tsx` | Modify | Overflow fix responsive |
| `src/app/chansons/[slug]/SongDetailClient.tsx` | Modify | Overflow + gap fix |
| `src/app/profil/ProfileForm.tsx` | Modify | Grid + bouton responsive |
| `src/components/chord-editor/ChordPicker.tsx` | Modify | Grid responsive |
| `src/app/admin/layout.tsx` | Modify | Nav flex-wrap |
| `src/app/admin/artistes/EditArtistButton.tsx` | Modify | Layout + aria-labels |
| `src/app/playlists/PlaylistManagerClient.tsx` | Modify | Drag constraint + trash button |
| `src/components/TransposeControls.tsx` | Modify | Select responsive + focus-visible |
| `src/app/page.tsx` | Modify | Hero text responsive |
| `src/app/mes-contributions/page.tsx` | Modify | Header responsive |
| `src/app/mes-contributions/DeleteMySheetButton.tsx` | Modify | Retirer override h-7 |
| `src/components/SearchBar.tsx` | Modify | aria-label |
| `src/components/PlaylistShareModal.tsx` | Modify | QR responsive |
| `src/app/chansons/[slug]/loading.tsx` | **Create** | Skeleton page detail chanson |
| `src/app/playlists/loading.tsx` | **Create** | Skeleton page playlists |
| `src/app/artistes/[slug]/loading.tsx` | **Create** | Skeleton page detail artiste |
| `src/app/admin/loading.tsx` | **Create** | Skeleton page admin |

---

## Task 1: Fondations — Button sizes + Viewport + CSS global

**Files:**
- Modify: `src/components/ui/button.tsx:6-41`
- Modify: `src/app/layout.tsx:1-2,31-43`
- Modify: `src/app/globals.css:127-134`

- [ ] **Step 1: Augmenter les tailles Button**

In `src/components/ui/button.tsx`, replace the entire `size` variants block:

```ts
      size: {
        default:
          "h-10 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1 rounded-[min(var(--radius-md),12px)] px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        icon: "size-10",
        "icon-xs":
          "size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm":
          "size-9 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-11",
      },
```

- [ ] **Step 2: Ajouter l'export viewport dans layout.tsx**

Add after the existing imports (line 1-2), add the Viewport import. Then add the viewport export after the metadata export:

```ts
import type { Metadata, Viewport } from "next";
```

After the closing `};` of the metadata export (after line 43), add:

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};
```

- [ ] **Step 3: Ajouter safe areas CSS dans globals.css**

Append after the `.playlist-reader-active > main` rule (after line 134):

```css

/* Safe area for fullscreen readers (iPhone notch) */
@supports (padding: env(safe-area-inset-top)) {
  .reader-safe-area {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

- [ ] **Step 4: Verifier le build**

Run: `cd "/Users/maitoa/Desktop/Fenua-Chords/Fenua Chords" && npm run build`
Expected: Build succeeds without errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/button.tsx src/app/layout.tsx src/app/globals.css
git commit -m "fix: augmenter tailles Button globalement +8px, ajouter viewport + safe areas CSS"
```

---

## Task 2: ReaderToolbar — composant partage

**Files:**
- Create: `src/components/ReaderToolbar.tsx`

- [ ] **Step 1: Creer ReaderToolbar.tsx**

```tsx
'use client'

import { Minus, Plus, Play, Pause, ChevronsDown, X } from 'lucide-react'
import { getTransposedKey, getSemitonesBetween, getAllKeys } from '@/lib/transpose'

interface ReaderToolbarProps {
  title: string
  subtitle?: string
  badge?: string
  fontSizeIndex: number
  fontSizes: number[]
  onFontChange: (delta: number) => void
  semitones: number
  onSemitonesChange: (semitones: number) => void
  originalKey?: string | null
  scrolling: boolean
  onToggleScroll: () => void
  speedIndex: number
  speedLabels: string[]
  onSpeedChange: (delta: number) => void
  onClose: () => void
}

export function ReaderToolbar({
  title,
  subtitle,
  badge,
  fontSizeIndex,
  fontSizes,
  onFontChange,
  semitones,
  onSemitonesChange,
  originalKey,
  scrolling,
  onToggleScroll,
  speedIndex,
  speedLabels,
  onSpeedChange,
  onClose,
}: ReaderToolbarProps) {
  return (
    <div className="bg-card border-b border-border shrink-0 reader-safe-area">
      {/* Row 1: Title + Close */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-3 min-w-0">
          {badge && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">{badge}</span>
          )}
          <span className="text-sm font-medium truncate">{title}</span>
          {subtitle && (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">{subtitle}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted shrink-0"
          aria-label="Quitter le mode lecture"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Row 2: Controls */}
      <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto">
        {/* Font size */}
        <button
          onClick={() => onFontChange(-1)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted text-xs font-bold"
          aria-label="Reduire la taille du texte"
        >
          A-
        </button>
        <span className="text-xs text-muted-foreground w-6 text-center tabular-nums">{fontSizes[fontSizeIndex]}</span>
        <button
          onClick={() => onFontChange(1)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted text-sm font-bold"
          aria-label="Agrandir la taille du texte"
        >
          A+
        </button>

        <span className="w-px h-5 bg-border mx-1 shrink-0" />

        {/* Transpose */}
        {originalKey ? (
          <select
            value={getTransposedKey(originalKey, semitones)}
            onChange={(e) => {
              const delta = getSemitonesBetween(originalKey, e.target.value)
              onSemitonesChange(delta)
            }}
            className="h-9 min-w-[80px] rounded border border-input bg-background px-1.5 text-xs font-semibold text-chord touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {getAllKeys(originalKey).map((key) => (
              <option key={key} value={key}>
                {key}{key === originalKey ? ' ●' : ''}
              </option>
            ))}
          </select>
        ) : (
          <>
            <button
              onClick={() => onSemitonesChange(semitones - 1)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted touch-manipulation"
              aria-label="Baisser d'un demi-ton"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono w-8 text-center tabular-nums">
              {semitones === 0 ? '0' : `${Math.abs(semitones)} ${semitones > 0 ? '↑' : '↓'}`}
            </span>
            <button
              onClick={() => onSemitonesChange(semitones + 1)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted touch-manipulation"
              aria-label="Monter d'un demi-ton"
            >
              <Plus className="w-4 h-4" />
            </button>
          </>
        )}

        <span className="w-px h-5 bg-border mx-1 shrink-0" />

        {/* Auto-scroll */}
        <button
          onClick={() => onSpeedChange(-1)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted"
          aria-label="Ralentir le defilement"
        >
          <ChevronsDown className="w-4 h-4 rotate-180" />
        </button>
        <button
          onClick={onToggleScroll}
          className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded ${scrolling ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          aria-label={scrolling ? 'Pause auto-scroll' : 'Lancer auto-scroll'}
        >
          {scrolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={() => onSpeedChange(1)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted"
          aria-label="Accelerer le defilement"
        >
          <ChevronsDown className="w-4 h-4" />
        </button>
        <span className="text-xs text-muted-foreground ml-0.5 w-16 hidden sm:inline">{speedLabels[speedIndex]}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifier le build**

Run: `npm run build`
Expected: Build succeeds (composant non utilise encore mais doit compiler).

- [ ] **Step 3: Commit**

```bash
git add src/components/ReaderToolbar.tsx
git commit -m "feat: creer composant ReaderToolbar partage pour les readers"
```

---

## Task 3: Refactorer SongReaderModal pour utiliser ReaderToolbar

**Files:**
- Modify: `src/components/SongReaderModal.tsx:141-213`

- [ ] **Step 1: Remplacer la toolbar et ajouter safe area**

Replace the entire return block of `SongReaderModal` (lines 141-215) with:

```tsx
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden reader-safe-area">
      <ReaderToolbar
        title={title}
        subtitle={artistName}
        fontSizeIndex={fontSizeIndex}
        fontSizes={FONT_SIZES}
        onFontChange={adjustFont}
        semitones={semitones}
        onSemitonesChange={setSemitones}
        originalKey={originalKey}
        scrolling={scrolling}
        onToggleScroll={() => setScrolling((s) => !s)}
        speedIndex={speedIndex}
        speedLabels={SPEED_LABELS}
        onSpeedChange={adjustSpeed}
        onClose={onClose}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div style={{ fontSize: `${FONT_SIZES[fontSizeIndex]}px` }}>
            <ChordRenderer content={transposedContent} className="font-mono leading-relaxed whitespace-pre-wrap" />
          </div>
        </div>
      </div>
    </div>
  )
```

Add the import at the top of the file:

```ts
import { ReaderToolbar } from '@/components/ReaderToolbar'
```

Remove the now-unused imports: `X, Minus, Plus, ChevronsDown` (keep `Play, Pause` only if still used — they are not, remove them too). The Lucide imports line becomes:

```ts
import { } from 'lucide-react'
```

Which means delete the entire lucide import line since nothing is used.

- [ ] **Step 2: Verifier le build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/SongReaderModal.tsx
git commit -m "refactor: SongReaderModal utilise ReaderToolbar + safe areas"
```

---

## Task 4: Refactorer PlaylistReaderClient pour utiliser ReaderToolbar

**Files:**
- Modify: `src/app/playlists/[shareToken]/lecture/PlaylistReaderClient.tsx:1-6,198-328`

- [ ] **Step 1: Ajouter l'import ReaderToolbar**

Replace the lucide import (line 5):
```ts
import { ChevronLeft, ChevronRight } from 'lucide-react'
```

Add after the other imports:
```ts
import { ReaderToolbar } from '@/components/ReaderToolbar'
```

- [ ] **Step 2: Remplacer le return block**

Replace the entire return block (lines 198-329) with:

```tsx
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden reader-safe-area">
      <ReaderToolbar
        title={song.title}
        subtitle={song.artistName}
        badge={`${currentIndex + 1}/${songs.length}`}
        fontSizeIndex={fontSizeIndex}
        fontSizes={FONT_SIZES}
        onFontChange={adjustFont}
        semitones={semitones}
        onSemitonesChange={setSemitones}
        originalKey={song.originalKey}
        scrolling={scrolling}
        onToggleScroll={() => setScrolling((s) => !s)}
        speedIndex={speedIndex}
        speedLabels={SPEED_LABELS}
        onSpeedChange={adjustSpeed}
        onClose={handleClose}
      />

      {/* Song content */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="text-center mb-4">
            <h1 className="font-heading text-xl">{song.title}</h1>
            <p className="text-sm text-muted-foreground">{song.artistName}</p>
          </div>

          {content ? (
            <div style={{ fontSize: `${FONT_SIZES[fontSizeIndex]}px` }}>
              <ChordRenderer content={content} className="font-mono leading-relaxed whitespace-pre-wrap" />
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Aucune grille d&apos;accords disponible pour ce chant.
            </p>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-t border-border shrink-0">
        <button
          onClick={handlePrev}
          disabled={currentIndex <= 0}
          className="flex items-center gap-1 min-h-[44px] text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline truncate max-w-[120px]">
            {currentIndex > 0 ? songs[currentIndex - 1].title : ''}
          </span>
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex >= songs.length - 1}
          className="flex items-center gap-1 min-h-[44px] text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <span className="hidden sm:inline truncate max-w-[120px]">
            {currentIndex < songs.length - 1 ? songs[currentIndex + 1].title : ''}
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
```

- [ ] **Step 3: Verifier le build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/playlists/[shareToken]/lecture/PlaylistReaderClient.tsx
git commit -m "refactor: PlaylistReaderClient utilise ReaderToolbar + safe areas"
```

---

## Task 5: ChordRenderer + SongDetailClient — overflow fix

**Files:**
- Modify: `src/components/ChordRenderer.tsx:12`
- Modify: `src/app/chansons/[slug]/SongDetailClient.tsx:85,136`

- [ ] **Step 1: Fix ChordRenderer default className**

In `src/components/ChordRenderer.tsx`, replace line 12:

```tsx
    <div className={className ?? "font-mono text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words"}>
```

Changes: `text-base` → `text-sm md:text-base`, added `break-words`.

- [ ] **Step 2: Fix SongDetailClient overflow + metadata gap**

In `src/app/chansons/[slug]/SongDetailClient.tsx`, replace line 85:

```tsx
      <div className="flex flex-wrap gap-x-3 sm:gap-x-6 gap-y-1 text-sm text-muted-foreground mb-4">
```

Replace line 136:

```tsx
      <div className="bg-card rounded-xl p-4 sm:p-6 overflow-hidden break-words">
```

Changes: `gap-x-6` → `gap-x-3 sm:gap-x-6`, `p-6` → `p-4 sm:p-6`, `overflow-x-auto` → `overflow-hidden break-words`.

- [ ] **Step 3: Verifier le build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/ChordRenderer.tsx src/app/chansons/[slug]/SongDetailClient.tsx
git commit -m "fix: ChordRenderer responsive text + overflow hidden sur fiche chanson"
```

---

## Task 6: Corrections formulaires — ProfileForm + ChordPicker

**Files:**
- Modify: `src/app/profil/ProfileForm.tsx:103,137`
- Modify: `src/components/chord-editor/ChordPicker.tsx:94`

- [ ] **Step 1: Fix ProfileForm grid responsive**

In `src/app/profil/ProfileForm.tsx`, replace line 103:

```tsx
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

Replace line 137:

```tsx
      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
```

- [ ] **Step 2: Fix ChordPicker grid responsive**

In `src/components/chord-editor/ChordPicker.tsx`, replace line 94:

```tsx
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
```

- [ ] **Step 3: Verifier le build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/profil/ProfileForm.tsx src/components/chord-editor/ChordPicker.tsx
git commit -m "fix: ProfileForm grid responsive + ChordPicker 4 cols sur mobile"
```

---

## Task 7: Corrections admin — nav + EditArtistButton

**Files:**
- Modify: `src/app/admin/layout.tsx:15`
- Modify: `src/app/admin/artistes/EditArtistButton.tsx:41,54-60,63-67`

- [ ] **Step 1: Fix admin nav flex-wrap**

In `src/app/admin/layout.tsx`, replace line 15:

```tsx
      <nav className="flex flex-wrap gap-2 mb-8 border-b border-border pb-2">
```

- [ ] **Step 2: Fix EditArtistButton layout + aria-labels**

In `src/app/admin/artistes/EditArtistButton.tsx`, replace line 41:

```tsx
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
```

Replace lines 54-61 (the Check button):

```tsx
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSave}
          disabled={loading || !newName.trim()}
          aria-label="Enregistrer"
        >
          <Check className="w-4 h-4" />
        </Button>
```

Replace lines 63-68 (the X button):

```tsx
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { setEditing(false); setNewName(name); setNewOrigin(origin ?? ""); }}
          aria-label="Annuler"
        >
          <X className="w-4 h-4" />
        </Button>
```

Note: the `className="h-8 w-8"` and `className="h-8 w-8 text-primary"` overrides are removed — the `icon` size variant now produces `size-10` (40px) by default from Task 1.

- [ ] **Step 3: Verifier le build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/layout.tsx src/app/admin/artistes/EditArtistButton.tsx
git commit -m "fix: admin nav wrap + EditArtistButton responsive avec aria-labels"
```

---

## Task 8: Playlist — drag constraint + trash button + TransposeControls

**Files:**
- Modify: `src/app/playlists/PlaylistManagerClient.tsx:99-105,119-120`
- Modify: `src/components/TransposeControls.tsx:25,37,48`

- [ ] **Step 1: Fix drag activation constraint**

In `src/app/playlists/PlaylistManagerClient.tsx`, replace line 119-120:

```tsx
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
```

- [ ] **Step 2: Fix trash button in SortableSongRow**

In `src/app/playlists/PlaylistManagerClient.tsx`, replace lines 99-105:

```tsx
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(song.id)}
        aria-label={`Retirer ${song.title}`}
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
```

- [ ] **Step 3: Fix TransposeControls — remove h-8 w-8 overrides + focus-visible**

In `src/components/TransposeControls.tsx`, replace line 25 (the first Minus button):

```tsx
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(semitones - 1)}
            aria-label="Baisser d'un demi-ton"
          >
```

Replace line 37 (the select):

```tsx
            className="h-10 min-w-[100px] sm:min-w-[140px] rounded-md border border-input bg-background px-3 text-sm font-semibold text-chord touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Replace the second Button (around line 45-51, the Plus button after the select):

```tsx
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(semitones + 1)}
            aria-label="Monter d'un demi-ton"
          >
```

The `className="h-8 w-8"` overrides are removed so buttons use the new default `icon` size (40px).

- [ ] **Step 4: Verifier le build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/playlists/PlaylistManagerClient.tsx src/components/TransposeControls.tsx
git commit -m "fix: drag constraint 8px + trash button accessible + TransposeControls responsive"
```

---

## Task 9: Corrections mineures — hero, contributions, SearchBar, QR, DeleteMySheetButton

**Files:**
- Modify: `src/app/page.tsx:37`
- Modify: `src/app/mes-contributions/page.tsx:48`
- Modify: `src/app/mes-contributions/DeleteMySheetButton.tsx:34`
- Modify: `src/components/SearchBar.tsx:31`
- Modify: `src/components/PlaylistShareModal.tsx:110-111`

- [ ] **Step 1: Fix hero text responsive**

In `src/app/page.tsx`, replace line 37:

```tsx
        <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl text-primary mb-4">Fenua Chords</h1>
```

- [ ] **Step 2: Fix contributions header responsive**

In `src/app/mes-contributions/page.tsx`, replace line 48:

```tsx
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
```

- [ ] **Step 3: Fix DeleteMySheetButton — remove h-7 override**

In `src/app/mes-contributions/DeleteMySheetButton.tsx`, replace line 34:

```tsx
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
```

This removes the `h-7 px-2` override — the `sm` size variant now provides `h-9` (36px) from Task 1.

- [ ] **Step 4: Fix SearchBar aria-label**

In `src/components/SearchBar.tsx`, replace line 31:

```tsx
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Rechercher un chant ou artiste"
        className="pl-10 pr-4 py-2.5 h-auto rounded-xl border-primary/20 bg-card text-foreground placeholder:text-muted-foreground"
      />
```

- [ ] **Step 5: Fix PlaylistShareModal QR responsive**

In `src/components/PlaylistShareModal.tsx`, replace lines 110-111:

```tsx
            <div ref={qrRef} className="flex justify-center">
              <div className="w-full max-w-[200px] mx-auto">
                <QRCodeSVG value={shareUrl} size={200} level="M" className="w-full h-auto" />
              </div>
            </div>
```

- [ ] **Step 6: Verifier le build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/app/mes-contributions/page.tsx src/app/mes-contributions/DeleteMySheetButton.tsx src/components/SearchBar.tsx src/components/PlaylistShareModal.tsx
git commit -m "fix: hero responsive, contributions header, aria-labels, QR responsive"
```

---

## Task 10: Loading skeletons

**Files:**
- Create: `src/app/chansons/[slug]/loading.tsx`
- Create: `src/app/playlists/loading.tsx`
- Create: `src/app/artistes/[slug]/loading.tsx`
- Create: `src/app/admin/loading.tsx`

- [ ] **Step 1: Creer skeleton chanson detail**

Create `src/app/chansons/[slug]/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function SongDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Back link */}
      <Skeleton className="h-4 w-36 mb-8" />

      {/* Song header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-40" />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>

      {/* Transpose */}
      <Skeleton className="h-10 w-72 mb-6" />

      {/* Chord sheet */}
      <div className="bg-card rounded-xl p-4 sm:p-6 space-y-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${60 + Math.random() * 40}%` }} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Creer skeleton playlists**

Create `src/app/playlists/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function PlaylistLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>

      {/* Song list */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border rounded-lg">
            <Skeleton className="w-4 h-6" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Creer skeleton artiste detail**

Create `src/app/artistes/[slug]/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function ArtistDetailLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Back link */}
      <Skeleton className="h-4 w-32 mb-8" />

      {/* Artist header */}
      <div className="mb-8">
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Songs grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-5 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-5 w-20 rounded-full mt-3" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Creer skeleton admin**

Create `src/app/admin/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminLoading() {
  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="w-5 h-5 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent list */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 border rounded-lg">
            <div className="space-y-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verifier le build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/chansons/[slug]/loading.tsx src/app/playlists/loading.tsx src/app/artistes/[slug]/loading.tsx src/app/admin/loading.tsx
git commit -m "feat: ajouter loading skeletons pour chanson detail, playlists, artiste detail, admin"
```

---

## Task 11: Verification finale

- [ ] **Step 1: Build complet**

Run: `npm run build`
Expected: Build succeeds with 0 errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: No new warnings or errors.

- [ ] **Step 3: Verification visuelle rapide**

Run: `npm run dev`
Check manually in browser DevTools (responsive mode) at 320px, 430px, 768px:
- Homepage hero text sizes
- Button sizes across pages
- Reader toolbar layout (2 rows on mobile)
- ChordRenderer no horizontal scroll
- ProfileForm stacking on mobile
- Admin nav wrapping

- [ ] **Step 4: Commit final si ajustements**

If any visual adjustments needed, fix and commit:
```bash
git commit -m "fix: ajustements visuels post-verification responsive"
```
