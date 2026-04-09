import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { MergeArtists } from "./MergeArtists"
import { DeleteArtistButton } from "./DeleteArtistButton"
import { EditArtistButton } from "./EditArtistButton"
import { SearchBar } from "@/components/SearchBar"

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function AdminArtistesPage({ searchParams }: Props) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from("artists")
    .select("id, name, origin, slug, song_artists(count)")
    .order("name", { ascending: true })

  if (q) {
    query = query.ilike("name", `%${q}%`)
  }

  const { data: artists } = await query

  const artistsWithCount = (artists ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    origin: a.origin as string | null,
    slug: a.slug,
    songCount: Array.isArray(a.song_artists) ? (a.song_artists[0] as { count: number })?.count ?? 0 : 0,
  }))

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Artistes ({artistsWithCount.length})</h2>

      <Suspense>
        <SearchBar placeholder="Rechercher un artiste..." />
      </Suspense>

      {artistsWithCount.length >= 2 && (
        <MergeArtists
          artists={artistsWithCount.map(({ id, name, songCount }) => ({ id, name, songCount }))}
        />
      )}

      <div className="divide-y divide-border border rounded-lg overflow-hidden bg-card">
        {artistsWithCount.length > 0 ? (
          artistsWithCount.map((artist) => (
            <div key={artist.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{artist.name}</p>
                <p className="text-xs text-muted-foreground">
                  {artist.origin ?? "Origine inconnue"} · {artist.songCount} chanson(s) · <span className="font-mono">{artist.slug}</span>
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <EditArtistButton id={artist.id} name={artist.name} origin={artist.origin} />
                {artist.songCount === 0 && (
                  <DeleteArtistButton id={artist.id} name={artist.name} />
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground px-4 py-6">Aucun artiste trouvé.</p>
        )}
      </div>
    </div>
  )
}
