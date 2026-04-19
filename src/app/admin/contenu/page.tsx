import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { DeleteButton } from "./DeleteButton"
import { PublishButton } from "./PublishButton"
import { RevisionHistory } from "./RevisionHistory"
import { SearchBar } from "@/components/SearchBar"
import type { Style, Instrument } from "@/types/database"

interface SongRow {
  id: string
  title: string
  style: Style
  status: string
  created_at: string
  song_artists: { artists: { name: string } }[]
  profiles: { username: string } | null
  chord_sheets: { id: string; instrument: Instrument }[]
}

interface Props {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}

const PAGE_SIZE = 50

export default async function AdminContenuPage({ searchParams }: Props) {
  const { q, status, page } = await searchParams
  const supabase = await createClient()

  const currentPage = Math.max(1, Number(page) || 1)
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from("songs")
    .select(`
      id,
      title,
      style,
      status,
      created_at,
      song_artists(artists(name)),
      profiles:created_by(username),
      chord_sheets(id, instrument)
    `, { count: "exact" })
    .order("created_at", { ascending: false })

  if (q) {
    query = query.ilike("title", `%${q}%`)
  }

  if (status && status !== "tous") {
    query = query.eq("status", status)
  }

  query = query.range(from, to)

  const { data: songs, count } = await query

  const rows = (songs ?? []) as unknown as SongRow[]
  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1

  const styleLabels: Record<Style, string> = {
    bringue: "Bringue",
    himene: "Himène",
    variete: "Variété",
    traditionnel: "Traditionnel",
    autre: "Autre",
  }

  const statusFilters = [
    { value: "tous", label: "Tous" },
    { value: "published", label: "Publiés" },
    { value: "draft", label: "Brouillons" },
  ]
  const activeStatus = status ?? "tous"

  function buildPageLink(p: number) {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (activeStatus !== "tous") params.set("status", activeStatus)
    if (p > 1) params.set("page", String(p))
    const qs = params.toString()
    return `/admin/contenu${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Contenu ({count ?? rows.length})</h2>

      <Suspense>
        <SearchBar placeholder="Rechercher une chanson..." />
      </Suspense>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map(({ value, label }) => {
          const params = new URLSearchParams()
          if (q) params.set("q", q)
          if (value !== "tous") params.set("status", value)
          const qs = params.toString()
          return (
            <a
              key={value}
              href={`/admin/contenu${qs ? `?${qs}` : ""}`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                activeStatus === value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:border-foreground/30"
              }`}
            >
              {label}
            </a>
          )
        })}
      </div>

      <div className="space-y-3">
        {rows.length > 0 ? (
          rows.map((song) => {
            const artistNames = song.song_artists.map((sa) => sa.artists.name).join(", ")
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
                      {song.status === "draft" && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Brouillon
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {artistNames || "—"} · par {profile?.username ?? "inconnu"} ·{" "}
                      {new Date(song.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PublishButton
                      id={song.id}
                      currentStatus={song.status as "draft" | "published"}
                    />
                    <DeleteButton type="song" id={song.id} label={song.title} />
                  </div>
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
          <p className="text-sm text-muted-foreground">Aucune chanson trouvée.</p>
        )}
      </div>

      {/* Pagination — Load more style for admin */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          {currentPage > 1 && (
            <a
              href={buildPageLink(currentPage - 1)}
              className="px-4 py-2 rounded-lg text-sm border border-border bg-card hover:bg-muted transition-colors"
            >
              ← Précédent
            </a>
          )}
          <span className="text-sm text-muted-foreground">
            Page {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages && (
            <a
              href={buildPageLink(currentPage + 1)}
              className="px-4 py-2 rounded-lg text-sm border border-border bg-card hover:bg-muted transition-colors"
            >
              Suivant →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
