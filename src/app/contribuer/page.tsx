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
  artists: [],
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
    formData.artists.length > 0 &&
    content.trim().length > 0 &&
    !loading

  async function handleSubmit() {
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    const parsed = songSchema.safeParse({
      title: formData.title,
      artists: formData.artists.map((a) => ({ id: a.id, name: a.name })),
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

      // Check if banned
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("is_banned")
        .eq("id", user.id)
        .single()

      if (userProfile?.is_banned) {
        setError("Ton compte a ete suspendu. Tu ne peux plus contribuer.")
        setLoading(false)
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

      // Resolve all artists
      if (formData.artists.length === 0) throw new Error("Au moins un artiste requis")
      const artistIds: string[] = []

      for (const artist of formData.artists) {
        if (artist.id) {
          artistIds.push(artist.id)
        } else {
          const artistSlug = slugify(artist.name)
          const { data: existingArtist } = await supabase
            .from("artists")
            .select("id")
            .eq("slug", artistSlug)
            .single()

          if (existingArtist) {
            artistIds.push(existingArtist.id)
          } else {
            const { data: newArtist, error: artistError } = await supabase
              .from("artists")
              .insert({ name: artist.name, slug: artistSlug })
              .select("id")
              .single()

            if (artistError || !newArtist) {
              throw new Error(`Impossible de creer l'artiste ${artist.name}`)
            }
            artistIds.push(newArtist.id)
          }
        }
      }

      // Create song with slug collision retry
      const firstArtistName = formData.artists[0].name
      const songSlug = slugify(`${firstArtistName}-${parsed.data.title}`)
      let song = null

      for (let attempt = 0; attempt < 5; attempt++) {
        const trySlug = attempt === 0 ? songSlug : `${songSlug}-${attempt}`
        const result = await supabase
          .from("songs")
          .insert({
            title: parsed.data.title,
            slug: trySlug,
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
          throw new Error("Impossible de creer la chanson")
        }
      }

      if (!song) throw new Error("Impossible de creer la chanson (slug en conflit)")

      // Link all artists
      const { error: linkError } = await supabase
        .from("song_artists")
        .insert(artistIds.map((artistId) => ({ song_id: song.id, artist_id: artistId })))

      if (linkError) {
        throw new Error("Impossible de lier les artistes")
      }

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
    } catch {
      setError("Une erreur est survenue. Réessaie plus tard.")
      setLoading(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">Ajouter un chant</h1>
        <p className="text-muted-foreground">Partagez les accords d&apos;une chanson polynésienne</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Informations</h2>
        <SongForm data={formData} onChange={setFormData} />
      </section>

      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Accords</h2>
        <ChordEditor onContentChange={setContent} />
      </section>

      {/* Preview toggle */}
      {content.trim() && (
        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
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
