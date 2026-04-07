'use client'

import { useState } from 'react'
import { ChordRenderer } from '@/components/ChordRenderer'
import { TransposeControls } from '@/components/TransposeControls'
import { transposeChordPro } from '@/lib/transpose'
import type { Instrument } from '@/types/database'

const instrumentLabels: Record<Instrument, string> = {
  guitare: 'Guitare',
  ukulele: 'Ukulele',
  basse: 'Basse',
  'ukulele-bass': 'Ukulele Bass',
}

interface SheetWithProfile {
  id: string
  instrument: Instrument
  tuning: string | null
  capo: number | null
  content: string
  contributed_by: string
  votes_up: number
  votes_down: number
  is_official: boolean
  created_at: string
  profiles: { username: string } | null
}

interface SongDetailClientProps {
  sheets: SheetWithProfile[]
  originalKey: string | null
}

export function SongDetailClient({ sheets, originalKey }: SongDetailClientProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [semitones, setSemitones] = useState(0)

  if (sheets.length === 0) {
    return (
      <p className="text-text-muted">Aucune grille d&apos;accords disponible pour le moment.</p>
    )
  }

  const activeSheet = sheets[activeIndex]
  const transposedContent = transposeChordPro(activeSheet.content, semitones)

  return (
    <div>
      {/* Sheet selector tabs */}
      {sheets.length > 1 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.id}
              onClick={() => {
                setActiveIndex(index)
                setSemitones(0)
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                index === activeIndex
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-text-muted border-gray-200 hover:border-primary hover:text-primary'
              }`}
            >
              {instrumentLabels[sheet.instrument]}
              {sheet.is_official && (
                <span className="ml-1.5 text-xs opacity-75">★</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Sheet metadata */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-muted mb-4">
        <span>
          <span className="font-medium text-text">Instrument :</span>{' '}
          {instrumentLabels[activeSheet.instrument]}
        </span>
        {activeSheet.capo !== null && activeSheet.capo > 0 && (
          <span>
            <span className="font-medium text-text">Capo :</span> {activeSheet.capo}
          </span>
        )}
        {activeSheet.tuning && (
          <span>
            <span className="font-medium text-text">Accordage :</span> {activeSheet.tuning}
          </span>
        )}
        {activeSheet.profiles?.username && (
          <span>
            <span className="font-medium text-text">Contribution :</span>{' '}
            {activeSheet.profiles.username}
          </span>
        )}
      </div>

      {/* Transpose controls */}
      <div className="mb-6">
        <TransposeControls
          semitones={semitones}
          onChange={setSemitones}
          originalKey={originalKey ?? undefined}
        />
      </div>

      {/* Chord sheet */}
      <div className="bg-surface rounded-xl p-6 overflow-x-auto">
        <ChordRenderer content={transposedContent} />
      </div>
    </div>
  )
}
