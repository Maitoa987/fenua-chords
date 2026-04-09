'use client'

import { Minus, Plus } from 'lucide-react'
import { getTransposedKey, getSemitonesBetween, getAllKeys } from '@/lib/transpose'
import { Button } from '@/components/ui/button'

interface TransposeControlsProps {
  semitones: number
  onChange: (semitones: number) => void
  originalKey?: string
}

export function TransposeControls({ semitones, onChange, originalKey }: TransposeControlsProps) {
  if (originalKey) {
    const keys = getAllKeys(originalKey)
    const currentKey = getTransposedKey(originalKey, semitones)

    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Tonalite :</span>
        <div className="flex items-center gap-1.5 touch-manipulation">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(semitones - 1)}
            aria-label="Baisser d'un demi-ton"
          >
            <Minus size={14} />
          </Button>
          <select
            value={currentKey}
            onChange={(e) => {
              const delta = getSemitonesBetween(originalKey, e.target.value)
              onChange(delta)
            }}
            className="h-10 min-w-[100px] sm:min-w-[140px] rounded-md border border-input bg-background px-3 text-sm font-semibold text-chord touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {keys.map((key) => (
              <option key={key} value={key}>
                {key}{key === originalKey ? ' (Original)' : ''}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(semitones + 1)}
            aria-label="Monter d'un demi-ton"
          >
            <Plus size={14} />
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">
          Original : {originalKey}
        </span>
      </div>
    )
  }

  // Fallback: no originalKey
  const direction = semitones > 0 ? '↑' : semitones < 0 ? '↓' : ''
  const display = semitones === 0 ? '0' : `${Math.abs(semitones)} ${direction}`
  const tooltip = semitones === 0
    ? 'Tonalite originale'
    : `${Math.abs(semitones)} demi-ton${Math.abs(semitones) > 1 ? 's' : ''} plus ${semitones > 0 ? 'haut' : 'bas'}`

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Transposer</span>
      <div className="flex items-center gap-2 touch-manipulation">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={() => onChange(semitones - 1)}
          aria-label="Baisser d'un demi-ton"
        >
          <Minus size={14} />
        </Button>
        <span
          className="w-10 text-center text-sm font-semibold tabular-nums"
          title={tooltip}
        >
          {display}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={() => onChange(semitones + 1)}
          aria-label="Monter d'un demi-ton"
        >
          <Plus size={14} />
        </Button>
      </div>
    </div>
  )
}
