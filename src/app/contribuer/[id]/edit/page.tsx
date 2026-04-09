"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChordEditor } from "@/components/chord-editor/ChordEditor"
import type { Instrument } from "@/types/database"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { editSheetSchema } from "@/lib/validation"

const INSTRUMENTS: { value: Instrument; label: string }[] = [
  { value: "guitare", label: "Guitare" },
  { value: "ukulele", label: "Ukulele" },
  { value: "basse", label: "Basse" },
  { value: "ukulele-bass", label: "Ukulele Bass" },
]

const INSTRUMENT_LABEL: Record<Instrument, string> = Object.fromEntries(
  INSTRUMENTS.map((i) => [i.value, i.label])
) as Record<Instrument, string>

interface PageProps {
  params: Promise<{ id: string }>
}

interface SheetData {
  id: string
  song_id: string
  instrument: Instrument
  tuning: string | null
  capo: number | null
  content: string
  contributed_by: string
  songs: {
    slug: string
    title: string
  }
}

export default function EditChordSheetPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()

  const [sheet, setSheet] = useState<SheetData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [notOwner, setNotOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [instrument, setInstrument] = useState<Instrument>("guitare")
  const [capo, setCapo] = useState(0)
  const [tuning, setTuning] = useState("")
  const [content, setContent] = useState("")

  useEffect(() => {
    async function load() {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/connexion")
        return
      }

      const { data, error: fetchError } = await supabase
        .from("chord_sheets")
        .select("id, song_id, instrument, tuning, capo, content, contributed_by, songs(slug, title)")
        .eq("id", id)
        .single()

      if (fetchError || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      if (data.contributed_by !== user.id) {
        setNotOwner(true)
        setLoading(false)
        return
      }

      const typedData = data as unknown as SheetData
      setSheet(typedData)
      setInstrument(typedData.instrument)
      setCapo(typedData.capo ?? 0)
      setTuning(typedData.tuning ?? "")
      setContent(typedData.content)
      setLoading(false)
    }

    load()
  }, [id, router])

  async function handleSave() {
    if (!sheet) return
    setSaving(true)
    setError(null)

    const parsed = editSheetSchema.safeParse({ instrument, capo, tuning, content })

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Données invalides")
      setSaving(false)
      return
    }

    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from("chord_sheets")
        .update({
          instrument: parsed.data.instrument,
          capo: parsed.data.capo || null,
          tuning: parsed.data.tuning || null,
          content: parsed.data.content,
        })
        .eq("id", id)

      if (updateError) {
        throw new Error("Impossible de sauvegarder les modifications")
      }

      router.push(`/chansons/${sheet.songs.slug}`)
    } catch {
      setError("Une erreur est survenue. Réessaie plus tard.")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">Chargement...</p>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Fiche introuvable</h1>
        <p className="text-muted-foreground">Cette fiche d&apos;accords n&apos;existe pas.</p>
        <button onClick={() => router.back()} className="text-primary underline cursor-pointer">
          Retour
        </button>
      </main>
    )
  }

  if (notOwner) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Accès refusé</h1>
        <p className="text-muted-foreground">Vous ne pouvez modifier que vos propres fiches d&apos;accords.</p>
        <button onClick={() => router.back()} className="text-primary underline cursor-pointer">
          Retour
        </button>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">Modifier la fiche</h1>
        {sheet && (
          <p className="text-muted-foreground">{sheet.songs.title}</p>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Paramètres</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Instrument */}
          <div className="space-y-1">
            <Label>Instrument</Label>
            <Select
              value={instrument}
              onValueChange={(v) => setInstrument(v as Instrument)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: Instrument | null) => v ? INSTRUMENT_LABEL[v] : "Sélectionner..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {INSTRUMENTS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Capo */}
          <div className="space-y-1">
            <Label>Capo</Label>
            <Select
              value={String(capo)}
              onValueChange={(v) => setCapo(parseInt(v ?? "0"))}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: string | null) =>
                    v === null ? "Sans capo" : parseInt(v) === 0 ? "Sans capo" : `Capo ${v}`
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 13 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {i === 0 ? "Sans capo" : `Capo ${i}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tuning */}
          <div className="sm:col-span-2 space-y-1">
            <Label>Accordage</Label>
            <Input
              type="text"
              value={tuning}
              onChange={(e) => setTuning(e.target.value)}
              placeholder="ex: Standard, DADGAD, Open G..."
            />
          </div>
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Accords</h2>
        <ChordEditor initialContent={content} onContentChange={setContent} />
      </section>

      <Button
        size="lg"
        onClick={handleSave}
        disabled={saving || !content.trim()}
        className="w-full bg-accent hover:bg-accent/90 text-white"
      >
        {saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
      </Button>
    </main>
  )
}
