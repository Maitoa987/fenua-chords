'use client'

import { Minus, Plus } from 'lucide-react'
import { getTransposedKey } from '@/lib/transpose'

interface TransposeControlsProps {
  semitones: number
  onChange: (semitones: number) => void
  originalKey?: string
}

export function TransposeControls({ semitones, onChange, originalKey }: TransposeControlsProps) {
  const transposedKey = originalKey ? getTransposedKey(originalKey, semitones) : null

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500">Transposer</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(semitones - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100 transition-colors"
          aria-label="Baisser d'un demi-ton"
        >
          <Minus size={14} />
        </button>
        <span className="w-8 text-center text-sm font-semibold tabular-nums">
          {semitones > 0 ? `+${semitones}` : semitones}
        </span>
        <button
          onClick={() => onChange(semitones + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100 transition-colors"
          aria-label="Monter d'un demi-ton"
        >
          <Plus size={14} />
        </button>
      </div>
      {transposedKey && (
        <span className="text-sm font-medium text-chord">
          Tonalite : {transposedKey}
        </span>
      )}
    </div>
  )
}
