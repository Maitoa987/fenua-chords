import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { DeleteButton } from "./DeleteButton"
import { RevisionHistory } from "./RevisionHistory"
import type { Style, Instrument } from "@/types/database"

interface SongRow {
  id: string
  title: string
  style: Style
  created_at: string
  artists: { name: string } | null
  profiles: { username: string } | null
  chord_sheets: { id: string; instrument: Instrument }[]
}

export default async function AdminContenuPage() {
  const supabase = await createClient()

  const { data: songs } = await supabase
    .from("songs")
    .select(`
      id,
      title,
      style,
      created_at,
      artists(name),
      profiles:created_by(username),
      chord_sheets(id, instrument)
    `)
    .order("created_at", { ascending: false })
    .limit(50)

  const rows = (songs ?? []) as unknown as SongRow[]

  const styleLabels: Record<Style, string> = {
    bringue: "Bringue",
    himene: "Himène",
    variete: "Variété",
    traditionnel: "Traditionnel",
    autre: "Autre",
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Contenu — 50 dernières chansons ({rows.length})</h2>

      <div className="space-y-3">
        {rows.length > 0 ? (
          rows.map((song) => {
            const artist = Array.isArray(song.artists) ? song.artists[0] : song.artists
            const profile = Array.isArray(song.profiles) ? song.profiles[0] : song.profiles
            const sheets = Array.isArray(song.chord_sheets) ? song.chord_sheets : []

            return (
              <div key={song.id} className="border rounded-lg bg-card overflow-hidden">
                {/* Song row */}
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{song.title}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {styleLabels[song.style]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {artist?.name ?? "—"} · par {profile?.username ?? "inconnu"} ·{" "}
                      {new Date(song.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <DeleteButton type="song" id={song.id} label={song.title} />
                </div>

                {/* Chord sheets */}
                {sheets.length > 0 && (
                  <div className="border-t divide-y divide-border bg-muted/30">
                    {sheets.map((sheet) => (
                      <div
                        key={sheet.id}
                        className="flex items-center justify-between gap-3 px-4 py-2 pl-8"
                      >
                        <span className="text-xs text-muted-foreground capitalize">
                          Partition — {sheet.instrument}
                        </span>
                        <div className="flex items-center gap-2">
                          <RevisionHistory
                            sheetId={sheet.id}
                            sheetLabel={`${sheet.instrument} de ${song.title}`}
                          />
                          <DeleteButton
                            type="chord_sheet"
                            id={sheet.id}
                            label={`partition ${sheet.instrument} de ${song.title}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <p className="text-sm text-muted-foreground">Aucune chanson.</p>
        )}
      </div>
    </div>
  )
}
