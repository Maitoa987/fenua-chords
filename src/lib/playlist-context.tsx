'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface PlaylistSongItem {
  id: string
  songId: string
  title: string
  slug: string
  artistName: string
  position: number
}

interface ActivePlaylist {
  id: string
  title: string
  shareToken: string
  songs: PlaylistSongItem[]
  currentIndex: number
}

interface PlaylistContextValue {
  active: ActivePlaylist | null
  activate: (playlist: Omit<ActivePlaylist, 'currentIndex'>, startIndex?: number) => void
  deactivate: () => void
  goToIndex: (index: number) => void
  next: () => void
  prev: () => void
}

const PlaylistContext = createContext<PlaylistContextValue | null>(null)

const STORAGE_KEY = 'fenua-active-playlist'

function getInitialPlaylist(): ActivePlaylist | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActivePlaylist | null>(getInitialPlaylist)

  // Persist to sessionStorage on change
  useEffect(() => {
    if (active) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(active))
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [active])

  const activate = useCallback((playlist: Omit<ActivePlaylist, 'currentIndex'>, startIndex = 0) => {
    setActive({ ...playlist, currentIndex: startIndex })
  }, [])

  const deactivate = useCallback(() => {
    setActive(null)
  }, [])

  const goToIndex = useCallback((index: number) => {
    setActive((prev) => {
      if (!prev) return null
      const clamped = Math.max(0, Math.min(index, prev.songs.length - 1))
      return { ...prev, currentIndex: clamped }
    })
  }, [])

  const next = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.currentIndex >= prev.songs.length - 1) return prev
      return { ...prev, currentIndex: prev.currentIndex + 1 }
    })
  }, [])

  const prev = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.currentIndex <= 0) return prev
      return { ...prev, currentIndex: prev.currentIndex - 1 }
    })
  }, [])

  return (
    <PlaylistContext value={{ active, activate, deactivate, goToIndex, next, prev }}>
      {children}
    </PlaylistContext>
  )
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext)
  if (!ctx) throw new Error('usePlaylist must be used within PlaylistProvider')
  return ctx
}
