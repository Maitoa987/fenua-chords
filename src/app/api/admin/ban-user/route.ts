import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const body = await req.json()
  const { userId, banned } = body as { userId: string; banned: boolean }

  if (!userId || typeof banned !== "boolean") {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 })
  }

  if (userId === user.id) {
    return NextResponse.json({ error: "Impossible de se bannir soi-même" }, { status: 400 })
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_banned: banned })
    .eq("id", userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
