"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  id: string
  currentStatus: "draft" | "published"
}

export function PublishButton({ id, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const nextStatus = currentStatus === "draft" ? "published" : "draft"
  const label = currentStatus === "draft" ? "Publier" : "Dépublier"
  const Icon = currentStatus === "draft" ? CheckCircle2 : EyeOff

  async function handleClick() {
    setLoading(true)
    const res = await fetch("/api/admin/update-song-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus }),
    })

    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error ?? "Une erreur est survenue")
    }
    setLoading(false)
  }

  return (
    <Button
      variant={currentStatus === "draft" ? "default" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className="gap-1.5"
    >
      <Icon className="w-3.5 h-3.5" />
      {loading ? "..." : label}
    </Button>
  )
}
