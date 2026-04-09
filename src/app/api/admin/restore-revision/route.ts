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
  const { revisionId } = body as { revisionId: string }

  if (!revisionId) {
    return NextResponse.json({ error: "revisionId requis" }, { status: 400 })
  }

  // Charger la révision
  const { data: revision, error: revError } = await supabase
    .from("chord_sheet_revisions")
    .select("chord_sheet_id, content, instrument, tuning, capo, edited_by")
    .eq("id", revisionId)
    .single()

  if (revError || !revision) {
    return NextResponse.json({ error: "Révision introuvable" }, { status: 404 })
  }

  // Sauvegarder l'état actuel comme nouvelle révision avant restauration
  const { data: currentSheet } = await supabase
    .from("chord_sheets")
    .select("content, instrument, tuning, capo")
    .eq("id", revision.chord_sheet_id)
    .single()

  if (currentSheet) {
    await supabase.from("chord_sheet_revisions").insert({
      chord_sheet_id: revision.chord_sheet_id,
      content: currentSheet.content,
      instrument: currentSheet.instrument,
      tuning: currentSheet.tuning,
      capo: currentSheet.capo,
      edited_by: user.id,
    })
  }

  // Restaurer le contenu de la révision
  const { error: updateError } = await supabase
    .from("chord_sheets")
    .update({
      content: revision.content,
      instrument: revision.instrument,
      tuning: revision.tuning,
      capo: revision.capo,
      updated_at: new Date().toISOString(),
      last_edited_by: user.id,
    })
    .eq("id", revision.chord_sheet_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
