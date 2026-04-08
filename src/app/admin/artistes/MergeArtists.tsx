"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Artist {
  id: string
  name: string
  songCount: number
}

interface MergeArtistsProps {
  artists: Artist[]
}

export function MergeArtists({ artists }: MergeArtistsProps) {
  const router = useRouter()
  const [sourceId, setSourceId] = useState<string>("")
  const [targetId, setTargetId] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const sourceArtist = artists.find((a) => a.id === sourceId)
  const targetArtist = artists.find((a) => a.id === targetId)

  const sourceOptions = artists.filter((a) => a.id !== targetId)
  const targetOptions = artists.filter((a) => a.id !== sourceId)

  async function handleMerge() {
    if (!sourceId || !targetId) return

    const confirmed = window.confirm(
      `Fusionner « ${sourceArtist?.name} » (${sourceArtist?.songCount} chanson(s)) dans « ${targetArtist?.name} » ?\n\nToutes les chansons seront rattachées à « ${targetArtist?.name} » et l'artiste source sera supprimé. Cette action est irréversible.`
    )
    if (!confirmed) return

    setLoading(true)

    const res = await fetch("/api/admin/merge-artists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, targetId }),
    })

    if (res.ok) {
      setSourceId("")
      setTargetId("")
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error ?? "Une erreur est survenue")
    }

    setLoading(false)
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-card space-y-4">
      <h3 className="font-semibold text-sm">Fusionner des doublons</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Artiste à supprimer (source)</label>
          <Select value={sourceId} onValueChange={(v) => setSourceId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un artiste..." />
            </SelectTrigger>
            <SelectContent>
              {sourceOptions.map((artist) => (
                <SelectItem key={artist.id} value={artist.id}>
                  {artist.name} ({artist.songCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Garder (cible)</label>
          <Select value={targetId} onValueChange={(v) => setTargetId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un artiste..." />
            </SelectTrigger>
            <SelectContent>
              {targetOptions.map((artist) => (
                <SelectItem key={artist.id} value={artist.id}>
                  {artist.name} ({artist.songCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        variant="destructive"
        size="sm"
        disabled={!sourceId || !targetId || loading}
        onClick={handleMerge}
      >
        {loading ? "Fusion en cours..." : "Fusionner"}
      </Button>
    </div>
  )
}
