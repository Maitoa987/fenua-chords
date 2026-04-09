import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { SuggestionActions } from "./SuggestionActions"
import type { SuggestionType, SuggestionStatus } from "@/types/database"

const TYPE_LABELS: Record<SuggestionType, string> = {
  correction_artiste: "Correction artiste",
  fusion_artiste: "Fusion artiste",
  correction_chanson: "Correction chanson",
  signalement: "Signalement",
}

const STATUS_VARIANT: Record<SuggestionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default",
  accepted: "secondary",
  rejected: "destructive",
}

const STATUS_LABELS: Record<SuggestionStatus, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  rejected: "Rejetée",
}

interface SuggestionRow {
  id: string
  type: SuggestionType
  target_type: string
  target_id: string
  message: string
  status: SuggestionStatus
  admin_note: string | null
  created_at: string
  profiles: { username: string } | null
}

export default async function AdminSuggestionsPage() {
  const supabase = await createClient()

  const { data: suggestions } = await supabase
    .from("suggestions")
    .select(`
      id,
      type,
      target_type,
      target_id,
      message,
      status,
      admin_note,
      created_at,
      profiles:user_id(username)
    `)
    .order("created_at", { ascending: false })
    .limit(100)

  const rows = (suggestions ?? []) as unknown as SuggestionRow[]
  const pending = rows.filter((r) => r.status === "pending")
  const resolved = rows.filter((r) => r.status !== "pending")

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-xl mb-1">Suggestions</h2>
        <p className="text-sm text-muted-foreground">
          {pending.length} en attente · {resolved.length} traitée{resolved.length > 1 ? "s" : ""}
        </p>
      </div>

      {pending.length === 0 && (
        <p className="text-muted-foreground text-center py-8">Aucune suggestion en attente.</p>
      )}

      {pending.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-semibold text-lg">En attente</h3>
          {pending.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} />
          ))}
        </section>
      )}

      {resolved.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-semibold text-lg text-muted-foreground">Historique</h3>
          {resolved.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} />
          ))}
        </section>
      )}
    </div>
  )
}

function SuggestionCard({ suggestion }: { suggestion: SuggestionRow }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_VARIANT[suggestion.status]}>
          {STATUS_LABELS[suggestion.status]}
        </Badge>
        <Badge variant="outline">{TYPE_LABELS[suggestion.type]}</Badge>
        <span className="text-xs text-muted-foreground">
          par {suggestion.profiles?.username ?? "inconnu"} · {new Date(suggestion.created_at).toLocaleDateString("fr-FR")}
        </span>
      </div>

      <p className="text-sm">{suggestion.message}</p>

      {suggestion.admin_note && (
        <p className="text-xs text-muted-foreground italic">Note admin : {suggestion.admin_note}</p>
      )}

      {suggestion.status === "pending" && (
        <SuggestionActions suggestionId={suggestion.id} />
      )}
    </div>
  )
}
