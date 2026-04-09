import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { StyleBadge } from '@/components/StyleBadge'
import { SongDetailClient } from './SongDetailClient'
import type { Style, Instrument } from '@/types/database'

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: song } = await supabase
    .from('songs')
    .select('title, artists(name)')
    .eq('slug', slug)
    .single()

  if (!song) {
    return { title: 'Chanson introuvable — Fenua Chords' }
  }

  const artist = song.artists as unknown as { name: string } | null
  const title = `${song.title}${artist ? ` — ${artist.name}` : ''} | Fenua Chords`
  const description = `Accords et paroles de ${song.title}${artist ? ` par ${artist.name}` : ''} sur Fenua Chords.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  }
}

export default async function SongDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: song } = await supabase
    .from('songs')
    .select(
      'id, title, slug, style, original_key, bpm, youtube_url, artists(name, slug), chord_sheets(id, instrument, tuning, capo, content, contributed_by, votes_up, votes_down, is_official, created_at, profiles:contributed_by(username))'
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!song) {
    notFound()
  }

  const artist = song.artists as unknown as { name: string; slug: string } | null

  type SheetRaw = {
    id: string
    instrument: string
    tuning: string | null
    capo: number | null
    content: string
    contributed_by: string
    votes_up: number
    votes_down: number
    is_official: boolean
    created_at: string
    profiles: { username: string } | null
  }

  const sheets = (
    Array.isArray(song.chord_sheets) ? song.chord_sheets : []
  ) as unknown as SheetRaw[]

  const typedSheets = sheets.map((s) => ({
    ...s,
    instrument: s.instrument as Instrument,
  }))

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Back link */}
      <Link
        href="/chansons"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Toutes les chansons
      </Link>

      {/* Song header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <StyleBadge style={song.style as Style} />
          {song.original_key && (
            <span className="text-sm text-muted-foreground font-mono">
              Tonalite : <span className="font-semibold text-foreground">{song.original_key}</span>
            </span>
          )}
          {song.bpm && (
            <span className="text-sm text-muted-foreground">
              BPM : <span className="font-semibold text-foreground">{song.bpm}</span>
            </span>
          )}
        </div>

        <h1 className="font-heading text-3xl text-foreground">{song.title}</h1>

        {artist && (
          <Link
            href={`/artistes/${artist.slug}`}
            className="text-primary hover:underline text-lg mt-1 inline-block"
          >
            {artist.name}
          </Link>
        )}
      </div>

      {/* Chord sheets with interactivity */}
      <SongDetailClient
        sheets={typedSheets}
        originalKey={song.original_key}
        currentUserId={user?.id ?? null}
        songId={song.id}
        songTitle={song.title}
        artistName={artist?.name ?? ''}
      />

      {/* YouTube link */}
      {song.youtube_url && (
        <div className="mt-8 pt-6 border-t border-border">
          <a
            href={song.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors font-medium"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 fill-current"
              aria-hidden="true"
            >
              <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
            </svg>
            Voir sur YouTube
          </a>
        </div>
      )}
    </div>
  )
}
