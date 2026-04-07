"use client"

import { useState, useEffect } from "react"
import { TapToChord } from "./TapToChord"
import { ChordProTextarea } from "./ChordProTextarea"
import { wordsToChordPro, extractLyrics, chordProToWordMap } from "@/lib/chordpro"

type Mode = "simple" | "texte"

interface ChordEditorProps {
  initialContent?: string
  onContentChange: (chordPro: string) => void
}

export function ChordEditor({ initialContent = "", onContentChange }: ChordEditorProps) {
  const [mode, setMode] = useState<Mode>("simple")
  const [lyrics, setLyrics] = useState(() => extractLyrics(initialContent))
  const [chordMap, setChordMap] = useState<Map<string, string>>(() =>
    chordProToWordMap(initialContent)
  )
  const [lyricsConfirmed, setLyricsConfirmed] = useState(false)
  const [chordProText, setChordProText] = useState(initialContent)

  // Emit changes upward
  useEffect(() => {
    if (mode === "simple") {
      const content = wordsToChordPro(lyrics, chordMap)
      onContentChange(content)
    } else {
      onContentChange(chordProText)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, lyrics, chordMap, chordProText])

  function switchToTexte() {
    // Serialize current simple state to ChordPro text
    const content = wordsToChordPro(lyrics, chordMap)
    setChordProText(content)
    setMode("texte")
  }

  function switchToSimple() {
    // Parse ChordPro text back to lyrics + map
    const parsedLyrics = extractLyrics(chordProText)
    const parsedMap = chordProToWordMap(chordProText)
    setLyrics(parsedLyrics)
    setChordMap(parsedMap)
    setLyricsConfirmed(parsedLyrics.trim().length > 0)
    setMode("simple")
  }

  function handleChordMapChange(newMap: Map<string, string>) {
    setChordMap(newMap)
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => mode === "texte" ? switchToSimple() : undefined}
          className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
            mode === "simple"
              ? "bg-primary text-white"
              : "bg-secondary/15 text-foreground hover:bg-secondary/30"
          }`}
        >
          Mode simple
        </button>
        <button
          onClick={() => mode === "simple" ? switchToTexte() : undefined}
          className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
            mode === "texte"
              ? "bg-primary text-white"
              : "bg-secondary/15 text-foreground hover:bg-secondary/30"
          }`}
        >
          Mode texte
        </button>
      </div>

      {/* Simple mode */}
      {mode === "simple" && (
        <div className="space-y-4">
          {!lyricsConfirmed ? (
            <div className="space-y-3">
              <p className="text-sm text-text-muted">
                Collez les paroles de la chanson, puis cliquez sur &ldquo;Placer les accords&rdquo;.
              </p>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={10}
                placeholder={"Ia ora na tatou\nE haere mai..."}
                className="w-full font-mono text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
              <button
                onClick={() => setLyricsConfirmed(true)}
                disabled={!lyrics.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Placer les accords →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-text-muted">
                Appuyez sur un mot pour lui assigner un accord.
              </p>
              <div className="border border-border rounded-lg px-4 py-3">
                <TapToChord
                  lyrics={lyrics}
                  chordMap={chordMap}
                  onChordMapChange={handleChordMapChange}
                />
              </div>
              <button
                onClick={() => {
                  setLyricsConfirmed(false)
                  setChordMap(new Map())
                }}
                className="text-sm text-text-muted underline cursor-pointer hover:text-foreground transition-colors"
              >
                Modifier les paroles
              </button>
            </div>
          )}
        </div>
      )}

      {/* Texte mode */}
      {mode === "texte" && (
        <ChordProTextarea
          value={chordProText}
          onChange={setChordProText}
        />
      )}
    </div>
  )
}
