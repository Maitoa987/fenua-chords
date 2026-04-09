"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { History, RotateCcw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Revision {
  id: string
  content: string
  instrument: string
  created_at: string
  profiles: { username: string } | null
}

interface RevisionHistoryProps {
  sheetId: string
  sheetLabel: string
}

export function RevisionHistory({ sheetId, sheetLabel }: RevisionHistoryProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    async function load() {
      setLoading(true)
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const { data } = await supabase
        .from("chord_sheet_revisions")
        .select("id, content, instrument, created_at, profiles:edited_by(username)")
        .eq("chord_sheet_id", sheetId)
        .order("created_at", { ascending: false })
        .limit(20)

      setRevisions((data ?? []) as unknown as Revision[])
      setLoading(false)
    }

    load()
  }, [open, sheetId])

  async function handleRestore(revisionId: string) {
    setRestoring(revisionId)
    try {
      const res = await fetch("/api/admin/restore-revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId }),
      })

      if (!res.ok) throw new Error()
      setOpen(false)
      router.refresh()
    } catch {
      setRestoring(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
        <History className="w-3 h-3" />
        Historique
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historique — {sheetLabel}</DialogTitle>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground py-4">Chargement...</p>}

        {!loading && revisions.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">Aucune révision enregistrée.</p>
        )}

        {!loading && revisions.length > 0 && (
          <ul className="space-y-3">
            {revisions.map((rev) => (
              <li key={rev.id} className="border border-border rounded-lg p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">
                    {new Date(rev.created_at).toLocaleString("fr-FR")} · {rev.profiles?.username ?? "inconnu"} · {rev.instrument}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={restoring !== null}
                    onClick={() => handleRestore(rev.id)}
                    className="text-xs"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    {restoring === rev.id ? "..." : "Restaurer"}
                  </Button>
                </div>
                <pre className="text-xs bg-muted/50 rounded p-2 max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {rev.content.slice(0, 300)}{rev.content.length > 300 ? "..." : ""}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
