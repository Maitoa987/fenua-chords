"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, X } from "lucide-react"

interface SuggestionActionsProps {
  suggestionId: string
}

export function SuggestionActions({ suggestionId }: SuggestionActionsProps) {
  const router = useRouter()
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleAction(status: "accepted" | "rejected") {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/update-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: suggestionId,
          status,
          admin_note: note || null,
        }),
      })

      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note admin (optionnel)"
        className="max-w-xs text-sm"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => handleAction("accepted")}
      >
        <Check className="w-3.5 h-3.5 mr-1" />
        Accepter
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => handleAction("rejected")}
        className="text-destructive"
      >
        <X className="w-3.5 h-3.5 mr-1" />
        Rejeter
      </Button>
    </div>
  )
}
