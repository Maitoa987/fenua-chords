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
  const { id, status, admin_note } = body as {
    id: string
    status: "accepted" | "rejected"
    admin_note: string | null
  }

  if (!id || !["accepted", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 })
  }

  const { error } = await supabase
    .from("suggestions")
    .update({
      status,
      admin_note,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
