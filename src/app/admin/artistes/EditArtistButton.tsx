"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Check, X } from "lucide-react"

interface EditArtistButtonProps {
  id: string
  name: string
  origin: string | null
}

export function EditArtistButton({ id, name, origin }: EditArtistButtonProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState(name)
  const [newOrigin, setNewOrigin] = useState(origin ?? "")
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!newName.trim()) return
    setLoading(true)

    const res = await fetch("/api/admin/update-artist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: newName.trim(), origin: newOrigin.trim() || null }),
    })

    if (res.ok) {
      setEditing(false)
      router.refresh()
    }
    setLoading(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nom"
          className="h-8 text-sm"
        />
        <Input
          value={newOrigin}
          onChange={(e) => setNewOrigin(e.target.value)}
          placeholder="Origine"
          className="h-8 text-sm w-28"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-primary"
          onClick={handleSave}
          disabled={loading || !newName.trim()}
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => { setEditing(false); setNewName(name); setNewOrigin(origin ?? ""); }}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(true)}>
      <Pencil className="w-3.5 h-3.5" />
    </Button>
  )
}
