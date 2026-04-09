"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ChordPickerProps {
  recentChords: string[]
  onSelect: (chord: string) => void
  onRemove: () => void
  onClose: () => void
  currentChord: string | null
}

const COMMON_CHORDS = [
  "Am", "A", "Bm", "B", "Cm", "C", "Dm",
  "D", "Em", "E", "Fm", "F", "Gm", "G",
]

export function ChordPicker({
  recentChords,
  onSelect,
  onRemove,
  onClose,
  currentChord,
}: ChordPickerProps) {
  const [customInput, setCustomInput] = useState("")

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault()
    const chord = customInput.trim()
    if (chord) {
      onSelect(chord)
      setCustomInput("")
    }
  }

  return (
    <Sheet open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl p-4 gap-4">
        <SheetHeader className="p-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-sm font-medium text-muted-foreground">
                Accord actuel :
              </SheetTitle>
              {currentChord ? (
                <>
                  <span className="font-mono font-bold text-chord">{currentChord}</span>
                  <Button
                    variant="link"
                    size="xs"
                    className="text-destructive p-0 h-auto"
                    onClick={onRemove}
                  >
                    Supprimer
                  </Button>
                </>
              ) : (
                <span className="text-sm italic text-muted-foreground">aucun</span>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Recent chords */}
        {recentChords.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Récents</p>
            <div className="flex flex-wrap gap-2">
              {recentChords.map((chord) => (
                <Button
                  key={chord}
                  variant="secondary"
                  className="min-w-[44px] h-[44px] font-mono"
                  onClick={() => onSelect(chord)}
                >
                  {chord}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Common chords grid */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Accords courants</p>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {COMMON_CHORDS.map((chord) => (
              <Button
                key={chord}
                variant="outline"
                className="min-w-[44px] h-[44px] font-mono"
                onClick={() => onSelect(chord)}
              >
                {chord}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom chord input */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Accord personnalisé</p>
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <Input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="ex: F#m7"
              className="flex-1 font-mono"
            />
            <Button type="submit" className="h-[44px] px-4">
              OK
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
