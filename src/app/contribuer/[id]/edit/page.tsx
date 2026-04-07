"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChordEditor } from "@/components/chord-editor/ChordEditor"
import type { Instrument } from "@/types/database"

const INSTRUMENTS: { value: Instrument; label: string }[] = [
  { value: "guitare", label: "Guitare" },
  { value: "ukulele", label: "Ukulele" },
  { value: "basse", label: "Basse" },
  { value: "ukulele-bass", label: "Ukulele Bass" },
]

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

    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from("chord_sheets")
        .update({
          instrument,
          capo: capo || null,
          tuning: tuning || null,
          content,
        })
        .eq("id", id)

      if (updateError) {
        throw new Error("Impossible de sauvegarder les modifications")
      }

      router.push(`/chansons/${sheet.songs.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-text-muted">Chargement...</p>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Fiche introuvable</h1>
        <p className="text-text-muted">Cette fiche d&apos;accords n&apos;existe pas.</p>
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
        <p className="text-text-muted">Vous ne pouvez modifier que vos propres fiches d&apos;accords.</p>
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
          <p className="text-text-muted">{sheet.songs.title}</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Paramètres</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Instrument */}
          <div>
            <label className="block text-sm font-medium mb-1">Instrument</label>
            <select
              value={instrument}
              onChange={(e) => setInstrument(e.target.value as Instrument)}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {INSTRUMENTS.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>

          {/* Capo */}
          <div>
            <label className="block text-sm font-medium mb-1">Capo</label>
            <select
              value={capo}
              onChange={(e) => setCapo(parseInt(e.target.value))}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Array.from({ length: 13 }, (_, i) => (
                <option key={i} value={i}>{i === 0 ? "Sans capo" : `Capo ${i}`}</option>
              ))}
            </select>
          </div>

          {/* Tuning */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Accordage</label>
            <input
              type="text"
              value={tuning}
              onChange={(e) => setTuning(e.target.value)}
              placeholder="ex: Standard, DADGAD, Open G..."
              className="w-full border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Accords</h2>
        <ChordEditor initialContent={content} onContentChange={setContent} />
      </section>

      <button
        onClick={handleSave}
        disabled={saving || !content.trim()}
        className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl cursor-pointer transition-colors"
      >
        {saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
      </button>
    </main>
  )
}
