"use client"

import { useState } from "react"

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
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-background rounded-t-2xl p-4 space-y-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-muted">Accord actuel :</span>
            {currentChord ? (
              <>
                <span className="font-mono font-bold text-chord">{currentChord}</span>
                <button
                  onClick={onRemove}
                  className="text-xs text-red-500 underline cursor-pointer"
                >
                  Supprimer
                </button>
              </>
            ) : (
              <span className="text-sm italic text-text-muted">aucun</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-foreground cursor-pointer"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Recent chords */}
        {recentChords.length > 0 && (
          <div>
            <p className="text-xs text-text-muted mb-2">Récents</p>
            <div className="flex flex-wrap gap-2">
              {recentChords.map((chord) => (
                <button
                  key={chord}
                  onClick={() => onSelect(chord)}
                  className="min-w-[44px] h-[44px] px-2 font-mono text-sm bg-secondary/15 rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors"
                >
                  {chord}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Common chords grid */}
        <div>
          <p className="text-xs text-text-muted mb-2">Accords courants</p>
          <div className="grid grid-cols-7 gap-2">
            {COMMON_CHORDS.map((chord) => (
              <button
                key={chord}
                onClick={() => onSelect(chord)}
                className="min-w-[44px] h-[44px] font-mono text-sm bg-secondary/15 rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors"
              >
                {chord}
              </button>
            ))}
          </div>
        </div>

        {/* Custom chord input */}
        <div>
          <p className="text-xs text-text-muted mb-2">Accord personnalisé</p>
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="ex: F#m7"
              className="flex-1 border border-border rounded-lg px-3 py-2 font-mono text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              className="px-4 h-[44px] bg-primary text-white rounded-lg font-medium text-sm cursor-pointer hover:bg-primary/90 transition-colors"
            >
              OK
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
