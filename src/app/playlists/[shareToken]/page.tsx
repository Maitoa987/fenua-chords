import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlaylistPublicClient } from './PlaylistPublicClient'

export const revalidate = 60

interface Props {
  params: Promise<{ shareToken: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareToken } = await params
  const supabase = await createClient()

  const { data: playlist } = await supabase
    .from('playlists')
    .select('title, profiles:owner_id(username)')
    .eq('share_token', shareToken)
    .single()

  if (!playlist) return { title: 'Playlist introuvable — Fenua Chords' }

  const owner = playlist.profiles as unknown as { username: string } | null
  const title = `${playlist.title}${owner ? ` par ${owner.username}` : ''} — Fenua Chords`

  return {
    title,
    description: `Playlist "${playlist.title}" sur Fenua Chords.`,
    openGraph: { title, type: 'website' },
  }
}

export default async function PlaylistPublicPage({ params }: Props) {
  const { shareToken } = await params
  const supabase = await createClient()

  const { data: playlist } = await supabase
    .from('playlists')
    .select('id, title, description, visibility, share_token, owner_id, profiles:owner_id(username)')
    .eq('share_token', shareToken)
    .single()

  if (!playlist || playlist.visibility === 'private') {
    notFound()
  }

  const { data: songs } = await supabase
    .from('playlist_songs')
    .select('id, song_id, position, songs(id, title, slug, style, artists(name))')
    .eq('playlist_id', playlist.id)
    .order('position')

  const { data: { user } } = await supabase.auth.getUser()

  // Check if current user follows this playlist
  let isFollowing = false
  if (user) {
    const { data: follow } = await supabase
      .from('playlist_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('playlist_id', playlist.id)
      .single()
    isFollowing = !!follow
  }

  const owner = playlist.profiles as unknown as { username: string } | null
  const isOwner = user?.id === playlist.owner_id

  const songItems = (songs ?? []).map((s) => {
    const song = s.songs as unknown as { id: string; title: string; slug: string; style: string; artists: { name: string } | null }
    return {
      id: s.id,
      songId: s.song_id,
      position: s.position,
      title: song.title,
      slug: song.slug,
      style: song.style,
      artistName: Array.isArray(song.artists)
        ? (song.artists[0] as { name: string })?.name ?? ''
        : song.artists?.name ?? '',
    }
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <PlaylistPublicClient
        playlist={{
          id: playlist.id,
          title: playlist.title,
          description: playlist.description,
          visibility: playlist.visibility,
          shareToken: playlist.share_token,
          ownerName: owner?.username ?? 'Inconnu',
        }}
        songs={songItems}
        currentUserId={user?.id ?? null}
        isOwner={isOwner}
        isFollowing={isFollowing}
      />
    </div>
  )
}
