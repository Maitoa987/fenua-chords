"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SongForm, type SongFormData } from "@/components/SongForm"
import { ChordEditor } from "@/components/chord-editor/ChordEditor"
import { ChordPreview } from "@/components/chord-editor/ChordPreview"
import { slugify } from "@/lib/slugify"
import { songSchema } from "@/lib/validation"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TurnstileWidget } from "@/components/TurnstileWidget"

const DEFAULT_FORM: SongFormData = {
  title: "",
  artist: null,
  style: "bringue",
  instrument: "guitare",
  originalKey: "",
  capo: 0,
  tuning: "",
}

export default function ContribuerPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<SongFormData>(DEFAULT_FORM)
  const [content, setContent] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const canSubmit =
    formData.title.trim().length > 0 &&
    formData.artist !== null &&
    content.trim().length > 0 &&
    !loading

  async function handleSubmit() {
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    const parsed = songSchema.safeParse({
      title: formData.title,
      artistName: formData.artist?.name ?? "",
      artistId: formData.artist?.id ?? null,
      style: formData.style,
      instrument: formData.instrument,
      originalKey: formData.originalKey,
      capo: formData.capo,
      tuning: formData.tuning,
      content,
    })

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Données invalides")
      setLoading(false)
      return
    }

    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      // Check auth
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/connexion")
        return
      }

      // Verify Turnstile token (only if widget was shown)
      if (turnstileToken) {
        const verifyRes = await fetch("/api/verify-turnstile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: turnstileToken }),
        })
        const { success } = await verifyRes.json()
        if (!success) {
          setError("Vérification échouée. Réessayez.")
          setLoading(false)
          return
        }
      }

      // Check rate limit
      const { data: canProceed } = await supabase.rpc("check_rate_limit", {
        user_uuid: user.id,
        max_per_hour: 10,
      })

      if (!canProceed) {
        setError("Tu as atteint la limite de contributions (10/heure). Réessaie plus tard.")
        setLoading(false)
        return
      }

      // Find or create artist
      if (!formData.artist) throw new Error("Artiste requis")
      let artistId: string

      if (formData.artist.id) {
        artistId = formData.artist.id
      } else {
        const artistSlug = slugify(formData.artist.name)
        const { data: existingArtist } = await supabase
          .from("artists")
          .select("id")
          .eq("slug", artistSlug)
          .single()

        if (existingArtist) {
          artistId = existingArtist.id
        } else {
          const { data: newArtist, error: artistError } = await supabase
            .from("artists")
            .insert({ name: formData.artist.name, slug: artistSlug })
            .select("id")
            .single()

          if (artistError || !newArtist) {
            throw new Error("Impossible de créer l'artiste")
          }
          artistId = newArtist.id
        }
      }

      // Create song with slug collision retry
      let songSlug = slugify(`${parsed.data.artistName}-${parsed.data.title}`)
      let song = null

      for (let attempt = 0; attempt < 5; attempt++) {
        const trySlug = attempt === 0 ? songSlug : `${songSlug}-${attempt}`
        const result = await supabase
          .from("songs")
          .insert({
            title: parsed.data.title,
            slug: trySlug,
            artist_id: artistId,
            style: parsed.data.style,
            original_key: parsed.data.originalKey || null,
            created_by: user.id,
            status: "published",
          })
          .select("id, slug")
          .single()

        if (!result.error) {
          song = result.data
          break
        }
        if (!result.error.message.includes("unique") && !result.error.message.includes("duplicate")) {
          throw new Error("Impossible de créer la chanson")
        }
      }

      if (!song) throw new Error("Impossible de créer la chanson (slug en conflit)")

      // Create chord sheet
      const { error: sheetError } = await supabase
        .from("chord_sheets")
        .insert({
          song_id: song.id,
          instrument: formData.instrument,
          tuning: formData.tuning || null,
          capo: formData.capo || null,
          content: parsed.data.content,
          contributed_by: user.id,
        })

      if (sheetError) {
        throw new Error("Impossible de créer la fiche d'accords")
      }

      router.push(`/chansons/${song.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
      setLoading(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">Contribuer</h1>
        <p className="text-muted-foreground">Partagez les accords d&apos;une chanson polynésienne</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Informations</h2>
        <SongForm data={formData} onChange={setFormData} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Accords</h2>
        <ChordEditor onContentChange={setContent} />
      </section>

      {/* Preview toggle */}
      {content.trim() && (
        <section className="space-y-3">
          <Button
            variant="link"
            onClick={() => setShowPreview((v) => !v)}
            className="p-0 h-auto"
          >
            {showPreview ? "Masquer la preview" : "Voir la preview"}
          </Button>
          {showPreview && (
            <div className="border border-border rounded-lg px-4 py-3 bg-secondary/5">
              <ChordPreview content={content} />
            </div>
          )}
        </section>
      )}

      {/* Turnstile */}
      <div className="pt-1">
        <TurnstileWidget onVerify={setTurnstileToken} />
      </div>

      {/* Submit */}
      <Button
        size="lg"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full bg-accent hover:bg-accent/90 text-white"
      >
        {loading ? "Publication..." : "Publier les accords"}
      </Button>
    </main>
  )
}
