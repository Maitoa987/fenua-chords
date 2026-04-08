"use client"

import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DeleteArtistButtonProps {
  id: string
  name: string
}

export function DeleteArtistButton({ id, name }: DeleteArtistButtonProps) {
  const router = useRouter()

  async function handleClick() {
    const confirmed = window.confirm(
      `Supprimer l'artiste « ${name} » ? Cette action est irréversible.`
    )
    if (!confirmed) return

    const res = await fetch("/api/admin/delete-artist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })

    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error ?? "Une erreur est survenue")
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleClick} className="gap-1.5">
      <Trash2 className="w-4 h-4" />
      Supprimer
    </Button>
  )
}
