import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Bookmark } from 'lucide-react'
import { requireAuth } from '@/lib/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { SongCard } from '@/components/SongCard'
import { SearchBar } from '@/components/SearchBar'
import type { Style } from '@/types/database'

export const metadata: Metadata = {
  title: 'Mes favoris — Fenua Chords',
}

const STYLES: { value: Style | 'tous'; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'bringue', label: 'Bringue' },
  { value: 'himene', label: 'Himene' },
  { value: 'variete', label: 'Variete' },
  { value: 'traditionnel', label: 'Traditionnel' },
  { value: 'autre', label: 'Autre' },
]

interface Props {
  searchParams: Promise<{ q?: string; style?: string }>
}

export default async function FavorisPage({ searchParams }: Props) {
  const { q, style } = await searchParams
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: favorites } = await supabase
    .from('favorites')
    .select('song_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const songIds = (favorites ?? []).map((f) => f.song_id)

  // Fetch liked song IDs for this user
  const { data: likes } = await supabase
    .from('likes')
    .select('song_id')
    .eq('user_id', user.id)
  const likedSongIds = new Set((likes ?? []).map((l) => l.song_id))

  type SongRow = {
    id: string
    title: string
    slug: string
    style: string
    original_key: string | null
    likes_count: number
    song_artists: { artists: { name: string } }[]
  }

  let songs: SongRow[] = []

  if (songIds.length > 0) {
    let songQuery = supabase
      .from('songs')
      .select('id, title, slug, style, original_key, likes_count, song_artists(artists(name))')
      .in('id', songIds)
      .eq('status', 'published')

    if (q) {
      songQuery = songQuery.ilike('title', `%${q}%`)
    }

    if (style && style !== 'tous') {
      songQuery = songQuery.eq('style', style)
    }

    const { data } = await songQuery

    // Maintain order by favorites.created_at (most recent first)
    const songMap = new Map((data ?? []).map((s) => [(s as unknown as SongRow).id, s as unknown as SongRow]))
    songs = songIds
      .map((id) => songMap.get(id))
      .filter((s): s is SongRow => s != null)
  }

  const activeStyle = style ?? 'tous'

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-2 mb-6">
        <Bookmark className="w-6 h-6 text-primary" />
        <h1 className="font-heading text-3xl text-foreground">Mes favoris</h1>
        <span className="text-muted-foreground text-sm ml-2">({songs.length})</span>
      </div>

      <Suspense>
        <SearchBar placeholder="Rechercher dans mes favoris..." />
      </Suspense>

      {/* Style filter */}
      <div className="flex flex-wrap gap-2 mt-6 mb-8">
        {STYLES.map(({ value, label }) => {
          const params = new URLSearchParams()
          if (q) params.set('q', q)
          if (value !== 'tous') params.set('style', value)
          const qs = params.toString()
          return (
            <a
              key={value}
              href={`/favoris${qs ? `?${qs}` : ''}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                activeStyle === value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-card text-muted-foreground border-primary/20 hover:border-primary/40'
              }`}
            >
              {label}
            </a>
          )
        })}
      </div>

      {songs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {q || (style && style !== 'tous')
              ? 'Aucun favori ne correspond à ta recherche.'
              : "Tu n\u2019as pas encore de chants en favoris."}
          </p>
          {!q && (!style || style === 'tous') && (
            <Link
              href="/chansons"
              className="text-primary hover:underline font-medium"
            >
              Explorer le catalogue
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {songs.map((song) => {
            const artistNames = (song.song_artists ?? []).map((sa) => sa.artists.name)
            return (
              <SongCard
                key={song.id}
                songId={song.id}
                title={song.title}
                slug={song.slug}
                artistNames={artistNames}
                style={song.style as Style}
                originalKey={song.original_key}
                likesCount={song.likes_count ?? 0}
                isLiked={likedSongIds.has(song.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
