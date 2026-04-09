'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Edit } from 'lucide-react'
import { ChordRenderer } from '@/components/ChordRenderer'
import { AddToPlaylistButton } from '@/components/AddToPlaylistButton'
import { TransposeControls } from '@/components/TransposeControls'
import { transposeChordPro } from '@/lib/transpose'
import type { Instrument } from '@/types/database'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
  currentUserId: string | null
  songId: string
  songTitle: string
}

export function SongDetailClient({ sheets, originalKey, currentUserId, songId, songTitle }: SongDetailClientProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [semitones, setSemitones] = useState(0)

  if (sheets.length === 0) {
    return (
      <p className="text-muted-foreground">Aucune grille d&apos;accords disponible pour le moment.</p>
    )
  }

  const activeSheet = sheets[activeIndex]
  const transposedContent = transposeChordPro(activeSheet.content, semitones)

  return (
    <div>
      {/* Sheet selector tabs */}
      {sheets.length > 1 && (
        <Tabs
          value={String(activeIndex)}
          onValueChange={(v) => {
            setActiveIndex(Number(v))
            setSemitones(0)
          }}
          className="mb-6"
        >
          <TabsList>
            {sheets.map((sheet, index) => (
              <TabsTrigger key={sheet.id} value={String(index)}>
                {instrumentLabels[sheet.instrument]}
                {sheet.is_official && (
                  <span className="ml-1.5 text-xs opacity-75">★</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Sheet metadata */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground mb-4">
        <span>
          <span className="font-medium text-foreground">Instrument :</span>{' '}
          {instrumentLabels[activeSheet.instrument]}
        </span>
        {activeSheet.capo !== null && activeSheet.capo > 0 && (
          <span>
            <span className="font-medium text-foreground">Capo :</span> {activeSheet.capo}
          </span>
        )}
        {activeSheet.tuning && (
          <span>
            <span className="font-medium text-foreground">Accordage :</span> {activeSheet.tuning}
          </span>
        )}
        {activeSheet.profiles?.username && (
          <span>
            <span className="font-medium text-foreground">Contribution :</span>{' '}
            {activeSheet.profiles.username}
          </span>
        )}
        {currentUserId && activeSheet.contributed_by === currentUserId && (
          <Link
            href={`/contribuer/${activeSheet.id}/edit`}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <Edit className="w-3.5 h-3.5" />
            Modifier
          </Link>
        )}
      </div>

      {/* Add to playlist */}
      <div className="mb-4">
        <AddToPlaylistButton songId={songId} songTitle={songTitle} />
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
      <div className="bg-card rounded-xl p-6 overflow-x-auto">
        <ChordRenderer content={transposedContent} />
      </div>
    </div>
  )
}
