import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { BanUserButton } from "./BanUserButton"
import type { Profile } from "@/types/database"

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, role, is_banned, created_at")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Utilisateurs ({profiles?.length ?? 0})</h2>

      <div className="divide-y divide-border border rounded-lg overflow-hidden bg-card">
        {profiles && profiles.length > 0 ? (
          profiles.map((profile: Pick<Profile, "id" | "username" | "role" | "is_banned" | "created_at">) => (
            <div key={profile.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-sm truncate">{profile.username}</span>
                {profile.role === "admin" && (
                  <Badge variant="secondary" className="shrink-0">Admin</Badge>
                )}
                {profile.is_banned && (
                  <Badge variant="destructive" className="shrink-0">Banni</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <time className="text-xs text-muted-foreground hidden sm:block">
                  {new Date(profile.created_at).toLocaleDateString("fr-FR")}
                </time>
                {profile.role !== "admin" && (
                  <BanUserButton
                    userId={profile.id}
                    isBanned={profile.is_banned}
                    username={profile.username}
                  />
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground px-4 py-6">Aucun utilisateur.</p>
        )}
      </div>
    </div>
  )
}
