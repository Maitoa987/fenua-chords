'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, Maximize2, X, Music } from 'lucide-react'
import { usePlaylist } from '@/lib/playlist-context'

export function PlaylistMiniBar() {
  const { active, next, prev, deactivate } = usePlaylist()
  const router = useRouter()
  const pathname = usePathname()

  // Don't show on the reader page itself
  if (!active || pathname.includes('/lecture')) return null

  const currentSong = active.songs[active.currentIndex]
  if (!currentSong) return null

  function handleFullscreen() {
    router.push(`/playlists/${active!.shareToken}/lecture`)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t-2 border-primary shadow-lg">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-2 gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Music className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{active.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {active.currentIndex + 1}/{active.songs.length} — {currentSong.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={prev}
            disabled={active.currentIndex <= 0}
            className="p-2 rounded hover:bg-muted disabled:opacity-30 transition-colors"
            aria-label="Chant précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            disabled={active.currentIndex >= active.songs.length - 1}
            className="p-2 rounded hover:bg-muted disabled:opacity-30 transition-colors"
            aria-label="Chant suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleFullscreen}
            className="p-2 rounded hover:bg-muted transition-colors"
            aria-label="Mode lecture plein écran"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={deactivate}
            className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Fermer la playlist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
