"use client"

import { useState } from "react"
import { ChordPicker } from "./ChordPicker"

interface TapToChordProps {
  lyrics: string
  chordMap: Map<string, string>
  onChordMapChange: (map: Map<string, string>) => void
}

export function TapToChord({ lyrics, chordMap, onChordMapChange }: TapToChordProps) {
  const [activePosition, setActivePosition] = useState<string | null>(null)
  const [recentChords, setRecentChords] = useState<string[]>([])

  const lines = lyrics.split("\n")

  function addRecent(chord: string) {
    setRecentChords((prev) => {
      const filtered = prev.filter((c) => c !== chord)
      return [chord, ...filtered].slice(0, 6)
    })
  }

  function handleSelect(chord: string) {
    if (!activePosition) return
    const newMap = new Map(chordMap)
    newMap.set(activePosition, chord)
    onChordMapChange(newMap)
    addRecent(chord)
    setActivePosition(null)
  }

  function handleRemove() {
    if (!activePosition) return
    const newMap = new Map(chordMap)
    newMap.delete(activePosition)
    onChordMapChange(newMap)
    setActivePosition(null)
  }

  return (
    <div className="font-mono text-base leading-relaxed">
      {lines.map((line, lineIndex) => {
        if (line.trim() === "") {
          return <div key={lineIndex} className="h-4" />
        }

        const parts = line.split(/(\s+)/)

        return (
          <div key={lineIndex} className="flex flex-wrap">
            {parts.map((part, partIndex) => {
              // Whitespace tokens — not interactive
              if (/^\s+$/.test(part)) {
                return <span key={partIndex}>{part}</span>
              }

              // Word tokens — calculate wordIndex among non-whitespace parts
              const wordsBefore = parts.slice(0, partIndex).filter((p) => !/^\s+$/.test(p))
              const wordIndex = wordsBefore.length
              const posKey = `${lineIndex}-${wordIndex}`
              const chord = chordMap.get(posKey)

              return (
                <button
                  key={partIndex}
                  onClick={() => setActivePosition(posKey)}
                  className="relative cursor-pointer hover:bg-secondary/20 rounded px-0.5 transition-colors min-h-[44px]"
                  style={{ paddingTop: "1.4em" }}
                >
                  {chord && (
                    <span
                      style={{ position: "absolute", top: 0, left: 0 }}
                      className="font-mono font-bold text-chord text-sm whitespace-nowrap"
                    >
                      {chord}
                    </span>
                  )}
                  {part}
                </button>
              )
            })}
          </div>
        )
      })}

      {activePosition !== null && (
        <ChordPicker
          recentChords={recentChords}
          onSelect={handleSelect}
          onRemove={handleRemove}
          onClose={() => setActivePosition(null)}
          currentChord={chordMap.get(activePosition) ?? null}
        />
      )}
    </div>
  )
}
