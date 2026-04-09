"use client"

import { useState } from "react"
import { MessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { SuggestionType } from "@/types/database"

const SUGGESTION_TYPES: { value: SuggestionType; label: string }[] = [
  { value: "correction_artiste", label: "Corriger le nom / infos artiste" },
  { value: "fusion_artiste", label: "Fusionner des artistes en double" },
  { value: "correction_chanson", label: "Corriger les infos de la chanson" },
  { value: "signalement", label: "Signaler un problème" },
]

interface SuggestCorrectionButtonProps {
  targetType: "artist" | "song" | "chord_sheet"
  targetId: string
  targetName: string
}

export function SuggestCorrectionButton({ targetType, targetId, targetName }: SuggestCorrectionButtonProps) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<SuggestionType>("correction_artiste")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    if (!message.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("Tu dois être connecté pour envoyer une suggestion.")
        setSubmitting(false)
        return
      }

      const { error: insertError } = await supabase
        .from("suggestions")
        .insert({
          user_id: user.id,
          type,
          target_type: targetType,
          target_id: targetId,
          message: message.trim(),
        })

      if (insertError) {
        throw new Error(insertError.message)
      }

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        setMessage("")
      }, 1500)
    } catch {
      setError("Impossible d'envoyer la suggestion. Réessaie plus tard.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        <MessageSquarePlus className="w-4 h-4" />
        Suggérer une correction
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suggérer une correction</DialogTitle>
          <DialogDescription>
            Concernant : <span className="font-medium">{targetName}</span>
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-4 text-center text-green-600 dark:text-green-400 font-medium">
            Suggestion envoyée ! Merci pour ta contribution.
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <Label>Type de correction</Label>
              <Select value={type} onValueChange={(v) => setType(v as SuggestionType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUGGESTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Décris la correction à apporter..."
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !message.trim()}
              >
                {submitting ? "Envoi..." : "Envoyer"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
