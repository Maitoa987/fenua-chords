import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { PlaylistManagerClient } from './PlaylistManagerClient'

export const metadata: Metadata = {
  title: 'Ma playlist — Fenua Chords',
}

export default async function PlaylistPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Fetch user's playlist with songs
  const { data: playlist } = await supabase
    .from('playlists')
    .select('id, title, description, visibility, share_token, created_at, updated_at')
    .eq('owner_id', user.id)
    .single()

  let songs: {
    id: string
    song_id: string
    position: number
    songs: { id: string; title: string; slug: string; style: string; artists: { name: string }[] } | null
  }[] = []

  if (playlist) {
    const { data } = await supabase
      .from('playlist_songs')
      .select('id, song_id, position, songs(id, title, slug, style, artists(name))')
      .eq('playlist_id', playlist.id)
      .order('position')

    songs = (data ?? []) as unknown as typeof songs
  }

  // Fetch followed playlists
  const { data: follows } = await supabase
    .from('playlist_follows')
    .select('id, playlist_id, playlists(id, title, share_token, visibility, profiles:owner_id(username))')
    .eq('follower_id', user.id)

  const followedPlaylists = (follows ?? []).map((f) => {
    const p = f.playlists as unknown as {
      id: string
      title: string
      share_token: string
      visibility: string
      profiles: { username: string } | null
    }
    return {
      followId: f.id,
      playlistId: f.playlist_id,
      title: p?.title ?? '',
      shareToken: p?.share_token ?? '',
      ownerName: p?.profiles?.username ?? 'Inconnu',
    }
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <PlaylistManagerClient
        playlist={playlist}
        songs={songs.map((s) => {
          const song = s.songs
          return {
            id: s.id,
            songId: s.song_id,
            position: s.position,
            title: song?.title ?? '',
            slug: song?.slug ?? '',
            style: song?.style ?? 'autre',
            artistName: song?.artists?.[0]?.name ?? '',
          }
        })}
        followedPlaylists={followedPlaylists}
      />
    </div>
  )
}
