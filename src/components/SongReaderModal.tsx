'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Minus, Plus, Play, Pause, ChevronsDown } from 'lucide-react'
import { ChordRenderer } from '@/components/ChordRenderer'
import { transposeChordPro } from '@/lib/transpose'

const SPEED_LABELS = ['Très lent', 'Lent', 'Normal', 'Rapide', 'Très rapide']
const SPEED_VALUES = [0.3, 0.6, 1.0, 1.8, 3.0]
const FONT_SIZES = [12, 14, 16, 18, 22, 26]
const STORAGE_KEY_SPEED = 'fenua-autoscroll-speed'
const STORAGE_KEY_FONT = 'fenua-reader-fontsize'

interface SongReaderModalProps {
  title: string
  artistName: string
  content: string
  originalKey: string | null
  onClose: () => void
}

export function SongReaderModal({ title, artistName, content, originalKey, onClose }: SongReaderModalProps) {
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

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const userScrollRef = useRef(false)

  // Wake Lock API
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null

    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen')
        }
      } catch { /* not supported */ }
    }

    requestWakeLock()

    function handleVisibility() {
      if (document.visibilityState === 'visible') requestWakeLock()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      wakeLock?.release()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // Hide header/footer
  useEffect(() => {
    document.body.classList.add('playlist-reader-active')
    return () => document.body.classList.remove('playlist-reader-active')
  }, [])

  // Escape key to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Auto-scroll
  useEffect(() => {
    if (!scrolling) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    const container = scrollContainerRef.current
    if (!container) return

    function step() {
      if (userScrollRef.current) {
        userScrollRef.current = false
        setScrolling(false)
        return
      }
      container!.scrollBy(0, SPEED_VALUES[speedIndex])
      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [scrolling, speedIndex])

  // Detect manual scroll → pause
  useEffect(() => {
    if (!scrolling) return
    const container = scrollContainerRef.current
    if (!container) return

    function handleWheel() { userScrollRef.current = true }
    function handleTouch() { userScrollRef.current = true }

    container.addEventListener('wheel', handleWheel)
    container.addEventListener('touchmove', handleTouch)
    return () => {
      container.removeEventListener('wheel', handleWheel)
      container.removeEventListener('touchmove', handleTouch)
    }
  }, [scrolling])

  // Persist preferences
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_SPEED, String(speedIndex))
  }, [speedIndex])
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_FONT, String(fontSizeIndex))
  }, [fontSizeIndex])

  function adjustSpeed(delta: number) {
    setSpeedIndex((prev) => Math.max(0, Math.min(SPEED_VALUES.length - 1, prev + delta)))
  }

  function adjustFont(delta: number) {
    setFontSizeIndex((prev) => Math.max(0, Math.min(FONT_SIZES.length - 1, prev + delta)))
  }

  const transposedContent = transposeChordPro(content, semitones)

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-card border-b border-border shrink-0 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium truncate">{title}</span>
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">{artistName}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Font size */}
          <button onClick={() => adjustFont(-1)} className="p-1.5 rounded hover:bg-muted text-xs font-bold" title="Réduire">
            A-
          </button>
          <span className="text-[10px] text-muted-foreground w-6 text-center">{FONT_SIZES[fontSizeIndex]}</span>
          <button onClick={() => adjustFont(1)} className="p-1.5 rounded hover:bg-muted text-sm font-bold" title="Agrandir">
            A+
          </button>

          <span className="w-px h-4 bg-border mx-1" />

          {/* Transpose */}
          <button onClick={() => setSemitones((s) => s - 1)} className="p-1.5 rounded hover:bg-muted">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono w-6 text-center">
            {semitones > 0 ? `+${semitones}` : semitones}
          </span>
          <button onClick={() => setSemitones((s) => s + 1)} className="p-1.5 rounded hover:bg-muted">
            <Plus className="w-3.5 h-3.5" />
          </button>

          {originalKey && (
            <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">
              {transposeChordPro(`[${originalKey}]`, semitones).replace(/[\[\]]/g, '')}
            </span>
          )}

          <span className="w-px h-4 bg-border mx-1" />

          {/* Auto-scroll */}
          <button onClick={() => adjustSpeed(-1)} className="p-1.5 rounded hover:bg-muted" title="Ralentir">
            <ChevronsDown className="w-3.5 h-3.5 rotate-180" />
          </button>
          <button
            onClick={() => setScrolling((s) => !s)}
            className={`p-1.5 rounded ${scrolling ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            title={scrolling ? 'Pause auto-scroll' : 'Lancer auto-scroll'}
          >
            {scrolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => adjustSpeed(1)} className="p-1.5 rounded hover:bg-muted" title="Accélérer">
            <ChevronsDown className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-muted-foreground ml-0.5 w-14">{SPEED_LABELS[speedIndex]}</span>

          <span className="w-px h-4 bg-border mx-1" />

          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted" title="Quitter (Échap)">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div style={{ fontSize: `${FONT_SIZES[fontSizeIndex]}px` }}>
            <ChordRenderer content={transposedContent} className="font-mono leading-relaxed whitespace-pre-wrap" />
          </div>
        </div>
      </div>
    </div>
  )
}
