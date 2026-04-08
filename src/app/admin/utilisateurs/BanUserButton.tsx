"use client"

import { useRouter } from "next/navigation"
import { Ban, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BanUserButtonProps {
  userId: string
  isBanned: boolean
  username: string
}

export function BanUserButton({ userId, isBanned, username }: BanUserButtonProps) {
  const router = useRouter()

  async function handleClick() {
    const action = isBanned ? "débannir" : "bannir"
    const confirmed = window.confirm(
      `Voulez-vous vraiment ${action} l'utilisateur « ${username} » ?`
    )
    if (!confirmed) return

    const res = await fetch("/api/admin/ban-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, banned: !isBanned }),
    })

    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error ?? "Une erreur est survenue")
    }
  }

  if (isBanned) {
    return (
      <Button variant="outline" size="sm" onClick={handleClick} className="gap-1.5">
        <CheckCircle className="w-4 h-4 text-green-600" />
        Débannir
      </Button>
    )
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleClick} className="gap-1.5">
      <Ban className="w-4 h-4" />
      Bannir
    </Button>
  )
}
