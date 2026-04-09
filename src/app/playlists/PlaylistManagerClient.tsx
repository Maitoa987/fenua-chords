'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, GripVertical, Play, Share2, ListMusic, Eye } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { StyleBadge } from '@/components/StyleBadge'
import { PlaylistShareModal } from '@/components/PlaylistShareModal'
import { createClient } from '@/lib/supabase/client'
import { generateShareToken } from '@/lib/playlist'
import { usePlaylist } from '@/lib/playlist-context'
import type { Visibility, Style } from '@/types/database'

interface PlaylistData {
  id: string
  title: string
  description: string | null
  visibility: Visibility
  share_token: string
  created_at: string
  updated_at: string
}

interface SongItem {
  id: string // playlist_songs.id
  songId: string
  position: number
  title: string
  slug: string
  style: string
  artistName: string
}

interface FollowedPlaylist {
  followId: string
  playlistId: string
  title: string
  shareToken: string
  ownerName: string
}

interface Props {
  playlist: PlaylistData | null
  songs: SongItem[]
  followedPlaylists: FollowedPlaylist[]
}

// Sortable song row
function SortableSongRow({
  song,
  onRemove,
}: {
  song: SongItem
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: song.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground touch-none">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <Link href={`/chansons/${song.slug}`} className="font-medium hover:text-primary truncate block">
          {song.title}
        </Link>
        <p className="text-sm text-muted-foreground">{song.artistName}</p>
      </div>
      <StyleBadge style={song.style as Style} />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(song.id)}
        aria-label={`Retirer ${song.title}`}
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}

export function PlaylistManagerClient({ playlist, songs: initialSongs, followedPlaylists }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(playlist?.title ?? 'Ma playlist')
  const [songs, setSongs] = useState(initialSongs)
  const [isEditing, setIsEditing] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const { activate } = usePlaylist()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Create playlist
  async function handleCreate() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('playlists').insert({
      owner_id: user.id,
      title: 'Ma playlist',
      share_token: generateShareToken(),
      visibility: 'private' as const,
    })

    if (!error) {
      startTransition(() => router.refresh())
    }
  }

  // Update title
  async function handleUpdateTitle() {
    if (!playlist) return
    const supabase = createClient()
    await supabase.from('playlists').update({ title }).eq('id', playlist.id)
    setIsEditing(false)
    startTransition(() => router.refresh())
  }

  // Remove song
  async function handleRemoveSong(playlistSongId: string) {
    if (!playlist) return
    const supabase = createClient()
    await supabase.from('playlist_songs').delete().eq('id', playlistSongId)
    setSongs((prev) => prev.filter((s) => s.id !== playlistSongId))
  }

  // Drag end — reorder
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !playlist) return

    const oldIndex = songs.findIndex((s) => s.id === active.id)
    const newIndex = songs.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(songs, oldIndex, newIndex)
    setSongs(reordered)

    // Persist new positions
    const supabase = createClient()
    await Promise.all(
      reordered.map((song, index) =>
        supabase
          .from('playlist_songs')
          .update({ position: index })
          .eq('id', song.id)
      )
    )
  }

  // Launch reading mode
  function handleLaunchReader() {
    if (!playlist || songs.length === 0) return
    activate({
      id: playlist.id,
      title: playlist.title,
      shareToken: playlist.share_token,
      songs: songs.map((s) => ({
        id: s.id,
        songId: s.songId,
        title: s.title,
        slug: s.slug,
        artistName: s.artistName,
        position: s.position,
      })),
    })
    router.push(`/playlists/${playlist.share_token}/lecture`)
  }

  // No playlist yet — creation prompt
  if (!playlist) {
    return (
      <div className="text-center py-20">
        <ListMusic className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-heading text-3xl mb-2">Ma playlist</h1>
        <p className="text-muted-foreground mb-6">
          Cree ta playlist pour organiser tes chants preferes.
        </p>
        <Button onClick={handleCreate} disabled={isPending}>
          <Plus className="w-4 h-4 mr-2" />
          Creer ma playlist
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="text-2xl font-heading"
                autoFocus
              />
              <Button size="sm" onClick={handleUpdateTitle}>OK</Button>
              <Button size="sm" variant="ghost" onClick={() => { setTitle(playlist.title); setIsEditing(false) }}>
                Annuler
              </Button>
            </div>
          ) : (
            <div>
              <h1
                className="font-heading text-3xl cursor-pointer hover:text-primary transition-colors"
                onClick={() => setIsEditing(true)}
                title="Cliquer pour modifier"
              >
                {playlist.title}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {songs.length} chant{songs.length > 1 ? 's' : ''} • {playlist.visibility === 'private' ? 'Privee' : playlist.visibility === 'link' ? 'Lien direct' : 'Publique'}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/playlists/${playlist.share_token}`}>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-1" />
              Apercu
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="w-4 h-4 mr-1" />
            Partager
          </Button>
          {songs.length > 0 && (
            <Button size="sm" onClick={handleLaunchReader}>
              <Play className="w-4 h-4 mr-1" />
              Lecture
            </Button>
          )}
        </div>
      </div>

      {/* Song list with drag & drop */}
      {songs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Ta playlist est vide. Ajoute des chants depuis le{' '}
              <Link href="/chansons" className="text-primary hover:underline">catalogue</Link>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={songs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {songs.map((song) => (
                <SortableSongRow key={song.id} song={song} onRemove={handleRemoveSong} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Followed playlists */}
      {followedPlaylists.length > 0 && (
        <div className="mt-12">
          <h2 className="font-heading text-xl mb-4">Playlists suivies</h2>
          <div className="space-y-2">
            {followedPlaylists.map((fp) => (
              <Link
                key={fp.followId}
                href={`/playlists/${fp.shareToken}`}
                className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
              >
                <div>
                  <p className="font-medium">{fp.title}</p>
                  <p className="text-sm text-muted-foreground">par {fp.ownerName}</p>
                </div>
                <Play className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quota banner */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
        Envie de plus de playlists ? <span className="font-medium">Bientot disponible</span>
      </div>

      {playlist && (
        <PlaylistShareModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          playlistId={playlist.id}
          shareToken={playlist.share_token}
          visibility={playlist.visibility}
        />
      )}
    </div>
  )
}
