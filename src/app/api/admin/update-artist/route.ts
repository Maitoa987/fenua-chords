import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/slugify"

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 })
  }

  const { id, name, origin } = await request.json()

  if (!id || !name?.trim()) {
    return NextResponse.json({ error: "Parametres invalides" }, { status: 400 })
  }

  const newSlug = slugify(name.trim())

  const { error } = await supabase
    .from("artists")
    .update({ name: name.trim(), origin: origin ?? null, slug: newSlug })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
