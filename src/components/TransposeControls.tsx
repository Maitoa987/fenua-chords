'use client'

import { Minus, Plus } from 'lucide-react'
import { getTransposedKey } from '@/lib/transpose'
import { Button } from '@/components/ui/button'

interface TransposeControlsProps {
  semitones: number
  onChange: (semitones: number) => void
  originalKey?: string
}

export function TransposeControls({ semitones, onChange, originalKey }: TransposeControlsProps) {
  const transposedKey = originalKey ? getTransposedKey(originalKey, semitones) : null

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Transposer</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(semitones - 1)}
          aria-label="Baisser d'un demi-ton"
        >
          <Minus size={14} />
        </Button>
        <span className="w-8 text-center text-sm font-semibold tabular-nums">
          {semitones > 0 ? `+${semitones}` : semitones}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(semitones + 1)}
          aria-label="Monter d'un demi-ton"
        >
          <Plus size={14} />
        </Button>
      </div>
      {transposedKey && (
        <span className="text-sm font-medium text-chord">
          Tonalite : {transposedKey}
        </span>
      )}
    </div>
  )
}
