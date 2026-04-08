import { requireAuth } from "@/lib/auth-guard"
import { createClient } from "@/lib/supabase/server"
import { ProfileForm } from "./ProfileForm"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Mon profil — Fenua Chords" }

export default async function ProfilPage() {
  const user = await requireAuth()
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, first_name, last_name, bio, created_at")
    .eq("id", user.id)
    .single()

  return (
    <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <h1 className="font-heading text-2xl text-primary">Mon profil</h1>
      <p className="text-sm text-muted-foreground">Email : {user.email}</p>
      <ProfileForm initialData={{
        username: profile?.username ?? "",
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        bio: profile?.bio ?? "",
      }} />
      <p className="text-xs text-muted-foreground">
        Membre depuis le {new Date(profile?.created_at ?? "").toLocaleDateString("fr-FR")}
      </p>
    </main>
  )
}
