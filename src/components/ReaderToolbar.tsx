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
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted text-xs font-bold shrink-0"
          aria-label="Reduire la taille du texte"
        >
          A-
        </button>
        <span className="text-xs text-muted-foreground w-6 text-center tabular-nums shrink-0">{fontSizes[fontSizeIndex]}</span>
        <button
          onClick={() => onFontChange(1)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted text-sm font-bold shrink-0"
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
            className="h-9 min-w-[80px] rounded border border-input bg-background px-1.5 text-xs font-semibold text-chord touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
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
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted touch-manipulation shrink-0"
              aria-label="Baisser d'un demi-ton"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono w-8 text-center tabular-nums shrink-0">
              {semitones === 0 ? '0' : `${Math.abs(semitones)} ${semitones > 0 ? '↑' : '↓'}`}
            </span>
            <button
              onClick={() => onSemitonesChange(semitones + 1)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted touch-manipulation shrink-0"
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
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted shrink-0"
          aria-label="Ralentir le defilement"
        >
          <ChevronsDown className="w-4 h-4 rotate-180" />
        </button>
        <button
          onClick={onToggleScroll}
          className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded shrink-0 ${scrolling ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          aria-label={scrolling ? 'Pause auto-scroll' : 'Lancer auto-scroll'}
        >
          {scrolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={() => onSpeedChange(1)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted shrink-0"
          aria-label="Accelerer le defilement"
        >
          <ChevronsDown className="w-4 h-4" />
        </button>
        <span className="text-xs text-muted-foreground ml-0.5 w-16 hidden sm:inline shrink-0">{speedLabels[speedIndex]}</span>
      </div>
    </div>
  )
}
