import type { Metadata } from 'next'
import Link from 'next/link'
import { Edit, Music, FileText } from 'lucide-react'
import { requireAuth } from '@/lib/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { StyleBadge } from '@/components/StyleBadge'
import { buttonVariants } from '@/components/ui/button'
import { DeleteMySheetButton } from './DeleteMySheetButton'
import type { Style, Instrument } from '@/types/database'

export const metadata: Metadata = {
  title: 'Mes contributions — Fenua Chords',
}

const instrumentLabels: Record<Instrument, string> = {
  guitare: 'Guitare',
  ukulele: 'Ukulele',
  basse: 'Basse',
  'ukulele-bass': 'Ukulele Bass',
}

export default async function MesContributionsPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: songs } = await supabase
    .from('songs')
    .select('id, title, slug, style, created_at, artists(name), chord_sheets(id, instrument, contributed_by)')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  type SongRaw = {
    id: string
    title: string
    slug: string
    style: string
    created_at: string
    artists: { name: string } | null
    chord_sheets: { id: string; instrument: string; contributed_by: string }[]
  }

  const typedSongs = (songs ?? []) as unknown as SongRaw[]

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 className="font-heading text-3xl text-foreground">Mes contributions</h1>
        <Link
          href="/contribuer"
          className={buttonVariants({ variant: 'default', size: 'sm' })}
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          Ajouter un chant
        </Link>
      </div>

      {/* Section Mes chansons */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            Mes chansons{' '}
            <span className="text-muted-foreground font-normal text-sm">
              ({typedSongs.length})
            </span>
          </h2>
        </div>

        {typedSongs.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            Tu n&apos;as pas encore ajouté de chanson.
          </p>
        ) : (
          <ul className="space-y-4">
            {typedSongs.map((song) => {
              const mySheets = song.chord_sheets.filter(
                (s) => s.contributed_by === user.id
              )

              return (
                <li
                  key={song.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  {/* Song header */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Link
                      href={`/chansons/${song.slug}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {song.title}
                    </Link>
                    {song.artists?.name && (
                      <span className="text-sm text-muted-foreground">
                        — {song.artists.name}
                      </span>
                    )}
                    <StyleBadge style={song.style as Style} />
                  </div>

                  {/* Chord sheets owned by this user */}
                  {mySheets.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {mySheets.map((sheet) => (
                        <li
                          key={sheet.id}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="flex-1">
                            {instrumentLabels[sheet.instrument as Instrument] ?? sheet.instrument}
                          </span>
                          <Link
                            href={`/contribuer/${sheet.id}/edit`}
                            className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                          >
                            <Edit className="w-3 h-3" />
                            Modifier
                          </Link>
                          <DeleteMySheetButton sheetId={sheet.id} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
