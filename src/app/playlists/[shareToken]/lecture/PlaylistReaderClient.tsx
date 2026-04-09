'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ChordRenderer } from '@/components/ChordRenderer'
import { ReaderToolbar } from '@/components/ReaderToolbar'
import { transposeChordPro, getTransposedKey, getSemitonesBetween, getAllKeys } from '@/lib/transpose'
import { usePlaylist } from '@/lib/playlist-context'

const SPEED_LABELS = ['Tres lent', 'Lent', 'Normal', 'Rapide', 'Tres rapide']
const SPEED_VALUES = [0.3, 0.6, 1.0, 1.8, 3.0] // pixels per frame
const FONT_SIZES = [12, 14, 16, 18, 22, 26]
const STORAGE_KEY_SPEED = 'fenua-autoscroll-speed'
const STORAGE_KEY_FONT = 'fenua-reader-fontsize'

interface SongData {
  id: string
  songId: string
  position: number
  title: string
  slug: string
  originalKey: string | null
  artistName: string
  sheet: { id: string; content: string; instrument: string; capo: number | null } | null
}

interface Props {
  playlistTitle: string
  shareToken: string
  playlistId: string
  songs: SongData[]
}

export function PlaylistReaderClient({ playlistTitle, shareToken, playlistId, songs }: Props) {
  const router = useRouter()
  const { active, activate, goToIndex, deactivate } = usePlaylist()

  const currentIndex = active?.currentIndex ?? 0
  const song = songs[currentIndex]

  const [semitones, setSemitones] = useState(0)
  const [fontSizeIndex, setFontSizeIndex] = useState(() => {
    if (typeof window === 'undefined') return 2
    const stored = sessionStorage.getItem(STORAGE_KEY_FONT)
    return stored ? parseInt(stored, 10) : 2
  })
  const [speedIndex, setSpeedIndex] = useState(() => {
    if (typeof window === 'undefined') return 2
    const stored = sessionStorage.getItem(STORAGE_KEY_SPEED)
    return stored ? parseInt(stored, 10) : 2
  })
  const [scrolling, setScrolling] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const userScrollRef = useRef(false)

  // Activate playlist context if not already
  useEffect(() => {
    if (!active || active.id !== playlistId) {
      activate({
        id: playlistId,
        title: playlistTitle,
        shareToken,
        songs: songs.map((s) => ({
          id: s.id,
          songId: s.songId,
          title: s.title,
          slug: s.slug,
          artistName: s.artistName,
          position: s.position,
        })),
      }, currentIndex)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Wake Lock API — prevent screen sleep
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null

    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen')
        }
      } catch {
        // Wake Lock not supported or denied
      }
    }

    requestWakeLock()

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      wakeLock?.release()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // Hide header/footer in reading mode
  useEffect(() => {
    document.body.classList.add('playlist-reader-active')
    return () => document.body.classList.remove('playlist-reader-active')
  }, [])

  // Auto-scroll logic
  useEffect(() => {
    if (!scrolling) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    function step() {
      if (userScrollRef.current) {
        userScrollRef.current = false
        setScrolling(false)
        return
      }
      window.scrollBy(0, SPEED_VALUES[speedIndex])
      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [scrolling, speedIndex])

  // Detect manual scroll -> pause auto-scroll
  useEffect(() => {
    if (!scrolling) return

    function handleWheel() {
      userScrollRef.current = true
    }
    function handleTouch() {
      userScrollRef.current = true
    }

    window.addEventListener('wheel', handleWheel)
    window.addEventListener('touchmove', handleTouch)
    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchmove', handleTouch)
    }
  }, [scrolling])

  // Persist speed & font size
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_SPEED, String(speedIndex))
  }, [speedIndex])
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_FONT, String(fontSizeIndex))
  }, [fontSizeIndex])

  // Reset semitones & scroll on song change
  const prevIndexRef = useRef(currentIndex)
  if (prevIndexRef.current !== currentIndex) {
    prevIndexRef.current = currentIndex
    if (semitones !== 0) setSemitones(0)
    if (scrolling) setScrolling(false)
  }
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [currentIndex])

  function handleClose() {
    deactivate()
    router.push(`/playlists/${shareToken}`)
  }

  function handlePrev() {
    if (currentIndex > 0) goToIndex(currentIndex - 1)
  }

  function handleNext() {
    if (currentIndex < songs.length - 1) goToIndex(currentIndex + 1)
  }

  function adjustSpeed(delta: number) {
    setSpeedIndex((prev) => Math.max(0, Math.min(SPEED_VALUES.length - 1, prev + delta)))
  }

  function adjustFont(delta: number) {
    setFontSizeIndex((prev) => Math.max(0, Math.min(FONT_SIZES.length - 1, prev + delta)))
  }

  if (!song) return null

  const content = song.sheet ? transposeChordPro(song.sheet.content, semitones) : null

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden reader-safe-area">
      <ReaderToolbar
        title={song.title}
        subtitle={song.artistName}
        badge={`${currentIndex + 1}/${songs.length}`}
        fontSizeIndex={fontSizeIndex}
        fontSizes={FONT_SIZES}
        onFontChange={adjustFont}
        semitones={semitones}
        onSemitonesChange={setSemitones}
        originalKey={song.originalKey}
        scrolling={scrolling}
        onToggleScroll={() => setScrolling((s) => !s)}
        speedIndex={speedIndex}
        speedLabels={SPEED_LABELS}
        onSpeedChange={adjustSpeed}
        onClose={handleClose}
      />

      {/* Song content */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="text-center mb-4">
            <h1 className="font-heading text-xl">{song.title}</h1>
            <p className="text-sm text-muted-foreground">{song.artistName}</p>
          </div>

          {content ? (
            <div style={{ fontSize: `${FONT_SIZES[fontSizeIndex]}px` }}>
              <ChordRenderer content={content} className="font-mono leading-relaxed whitespace-pre-wrap" />
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Aucune grille d&apos;accords disponible pour ce chant.
            </p>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-t border-border shrink-0">
        <button
          onClick={handlePrev}
          disabled={currentIndex <= 0}
          className="flex items-center gap-1 min-h-[44px] text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline truncate max-w-[120px]">
            {currentIndex > 0 ? songs[currentIndex - 1].title : ''}
          </span>
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex >= songs.length - 1}
          className="flex items-center gap-1 min-h-[44px] text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <span className="hidden sm:inline truncate max-w-[120px]">
            {currentIndex < songs.length - 1 ? songs[currentIndex + 1].title : ''}
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
