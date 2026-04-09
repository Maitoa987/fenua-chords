"use client"

import { useState, useEffect } from "react"
import { TapToChord } from "./TapToChord"
import { ChordProTextarea } from "./ChordProTextarea"
import { wordsToChordPro, extractLyrics, chordProToWordMap } from "@/lib/chordpro"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

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

  function switchMode(newMode: Mode) {
    if (newMode === mode) return
    if (newMode === "texte") {
      const content = wordsToChordPro(lyrics, chordMap)
      setChordProText(content)
      setMode("texte")
    } else {
      const parsedLyrics = extractLyrics(chordProText)
      const parsedMap = chordProToWordMap(chordProText)
      setLyrics(parsedLyrics)
      setChordMap(parsedMap)
      setLyricsConfirmed(parsedLyrics.trim().length > 0)
      setMode("simple")
    }
  }

  function handleChordMapChange(newMap: Map<string, string>) {
    setChordMap(newMap)
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)}>
        <TabsList>
          <TabsTrigger value="simple">Mode simple</TabsTrigger>
          <TabsTrigger value="texte">Mode texte</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Simple mode */}
      {mode === "simple" && (
        <div className="space-y-4">
          {!lyricsConfirmed ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Collez les paroles de la chanson, puis cliquez sur &ldquo;Placer les accords&rdquo;.
              </p>
              <Textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={16}
                placeholder={"Ia ora na tatou\nE haere mai..."}
                className="font-mono text-sm resize-y min-h-[300px]"
              />
              <Button
                onClick={() => setLyricsConfirmed(true)}
                disabled={!lyrics.trim()}
              >
                Placer les accords →
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Appuyez sur un mot pour lui assigner un accord.
              </p>
              <div className="border border-border rounded-lg px-4 py-3">
                <TapToChord
                  lyrics={lyrics}
                  chordMap={chordMap}
                  onChordMapChange={handleChordMapChange}
                />
              </div>
              <Button
                variant="link"
                onClick={() => {
                  setLyricsConfirmed(false)
                  setChordMap(new Map())
                }}
                className="p-0 h-auto text-muted-foreground"
              >
                Modifier les paroles
              </Button>
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
