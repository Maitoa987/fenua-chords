'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Play, Copy, Heart, HeartOff, ListMusic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StyleBadge } from '@/components/StyleBadge'
import { createClient } from '@/lib/supabase/client'
import { generateShareToken } from '@/lib/playlist'
import { usePlaylist } from '@/lib/playlist-context'
import type { Style, Visibility } from '@/types/database'

interface PlaylistInfo {
  id: string
  title: string
  description: string | null
  visibility: Visibility
  shareToken: string
  ownerName: string
}

interface SongItem {
  id: string
  songId: string
  position: number
  title: string
  slug: string
  style: string
  artistName: string
}

interface Props {
  playlist: PlaylistInfo
  songs: SongItem[]
  currentUserId: string | null
  isOwner: boolean
  isFollowing: boolean
}

export function PlaylistPublicClient({ playlist, songs, currentUserId, isOwner, isFollowing: initialFollowing }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [following, setFollowing] = useState(initialFollowing)
  const { activate } = usePlaylist()

  async function handleFollow() {
    if (!currentUserId) {
      router.push('/connexion')
      return
    }
    const supabase = createClient()
    if (following) {
      await supabase
        .from('playlist_follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('playlist_id', playlist.id)
      setFollowing(false)
    } else {
      await supabase.from('playlist_follows').insert({
        follower_id: currentUserId,
        playlist_id: playlist.id,
      })
      setFollowing(true)
    }
  }

  async function handleCopy() {
    if (!currentUserId) {
      router.push('/connexion')
      return
    }
    const supabase = createClient()

    // Check if user already has a playlist
    const { data: existing } = await supabase
      .from('playlists')
      .select('id')
      .eq('owner_id', currentUserId)
      .single()

    if (existing) {
      alert('Tu as déjà une playlist. Bientôt disponible : playlists illimitées !')
      return
    }

    // Create playlist with copied songs
    const { data: newPlaylist, error } = await supabase
      .from('playlists')
      .insert({
        owner_id: currentUserId,
        title: playlist.title,
        share_token: generateShareToken(),
        visibility: 'private' as const,
      })
      .select('id')
      .single()

    if (error || !newPlaylist) return

    // Copy songs
    if (songs.length > 0) {
      await supabase.from('playlist_songs').insert(
        songs.map((s, i) => ({
          playlist_id: newPlaylist.id,
          song_id: s.songId,
          position: i,
        }))
      )
    }

    startTransition(() => router.push('/playlists'))
  }

  function handleLaunchReader() {
    activate({
      id: playlist.id,
      title: playlist.title,
      shareToken: playlist.shareToken,
      songs: songs.map((s) => ({
        id: s.id,
        songId: s.songId,
        title: s.title,
        slug: s.slug,
        artistName: s.artistName,
        position: s.position,
      })),
    })
    router.push(`/playlists/${playlist.shareToken}/lecture`)
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <ListMusic className="w-10 h-10 text-primary mx-auto mb-3" />
        <h1 className="font-heading text-3xl">{playlist.title}</h1>
        <p className="text-muted-foreground mt-1">
          par {playlist.ownerName} • {songs.length} chant{songs.length > 1 ? 's' : ''}
        </p>
        {playlist.description && (
          <p className="text-sm text-muted-foreground mt-2">{playlist.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-center mb-8">
        {!isOwner && (
          <>
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={isPending}>
              <Copy className="w-4 h-4 mr-1" />
              Copier
            </Button>
            <Button
              variant={following ? 'default' : 'outline'}
              size="sm"
              onClick={handleFollow}
            >
              {following ? <HeartOff className="w-4 h-4 mr-1" /> : <Heart className="w-4 h-4 mr-1" />}
              {following ? 'Ne plus suivre' : 'Suivre'}
            </Button>
          </>
        )}
        {songs.length > 0 && (
          <Button size="sm" onClick={handleLaunchReader}>
            <Play className="w-4 h-4 mr-1" />
            Lecture
          </Button>
        )}
      </div>

      {/* Song list */}
      <div className="space-y-2">
        {songs.map((song, index) => (
          <Link
            key={song.id}
            href={`/chansons/${song.slug}`}
            className="flex items-center gap-4 px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
          >
            <span className="text-sm text-muted-foreground w-6 text-right">{index + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{song.title}</p>
              <p className="text-sm text-muted-foreground">{song.artistName}</p>
            </div>
            <StyleBadge style={song.style as Style} />
          </Link>
        ))}
      </div>

      {/* Auth hint for visitors */}
      {!currentUserId && (
        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link href="/connexion" className="text-primary hover:underline">Connecte-toi</Link> pour copier ou suivre cette playlist.
        </p>
      )}
    </div>
  )
}
