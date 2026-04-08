"use client"

import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DeleteButtonProps {
  type: "song" | "chord_sheet"
  id: string
  label: string
}

export function DeleteButton({ type, id, label }: DeleteButtonProps) {
  const router = useRouter()

  async function handleClick() {
    const confirmed = window.confirm(
      `Supprimer définitivement « ${label} » ?`
    )
    if (!confirmed) return

    const res = await fetch("/api/admin/delete-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
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
      <Trash2 className="w-3.5 h-3.5" />
      Supprimer
    </Button>
  )
}
