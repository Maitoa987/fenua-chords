import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlaylistReaderClient } from './PlaylistReaderClient'

export const metadata: Metadata = {
  title: 'Mode lecture — Fenua Chords',
}

interface Props {
  params: Promise<{ shareToken: string }>
}

export default async function PlaylistReaderPage({ params }: Props) {
  const { shareToken } = await params
  const supabase = await createClient()

  const { data: playlist } = await supabase
    .from('playlists')
    .select('id, title, share_token, visibility, owner_id')
    .eq('share_token', shareToken)
    .single()

  if (!playlist) notFound()

  // Allow private access only for owner
  if (playlist.visibility === 'private') {
    const { data: { user } } = await supabase.auth.getUser()
    if (playlist.owner_id !== user?.id) notFound()
  }

  const { data: songs } = await supabase
    .from('playlist_songs')
    .select('id, song_id, position, songs(id, title, slug, style, original_key, artists(name), chord_sheets(id, instrument, content, capo, tuning, votes_up, votes_down, is_official))')
    .eq('playlist_id', playlist.id)
    .order('position')

  const songItems = (songs ?? []).map((s) => {
    const song = s.songs as unknown as {
      id: string
      title: string
      slug: string
      style: string
      original_key: string | null
      artists: { name: string } | null
      chord_sheets: {
        id: string
        instrument: string
        content: string
        capo: number | null
        tuning: string | null
        votes_up: number
        votes_down: number
        is_official: boolean
      }[]
    }

    // Pick best sheet: official first, then highest votes
    const sheets = Array.isArray(song.chord_sheets) ? song.chord_sheets : []
    const bestSheet = sheets.sort((a, b) => {
      if (a.is_official !== b.is_official) return a.is_official ? -1 : 1
      return (b.votes_up - b.votes_down) - (a.votes_up - a.votes_down)
    })[0] ?? null

    return {
      id: s.id,
      songId: s.song_id,
      position: s.position,
      title: song.title,
      slug: song.slug,
      originalKey: song.original_key,
      artistName: Array.isArray(song.artists)
        ? (song.artists[0] as { name: string })?.name ?? ''
        : song.artists?.name ?? '',
      sheet: bestSheet ? { id: bestSheet.id, content: bestSheet.content, instrument: bestSheet.instrument, capo: bestSheet.capo } : null,
    }
  })

  return (
    <PlaylistReaderClient
      playlistTitle={playlist.title}
      shareToken={playlist.share_token}
      playlistId={playlist.id}
      songs={songItems}
    />
  )
}
