import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Music, Guitar, Users, FileText } from "lucide-react"

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: songsCount },
    { count: artistsCount },
    { count: usersCount },
    { count: sheetsCount },
    { count: bannedCount },
    { data: recentSongs },
  ] = await Promise.all([
    supabase.from("songs").select("*", { count: "exact", head: true }),
    supabase.from("artists").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("chord_sheets").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", true),
    supabase
      .from("songs")
      .select("id, title, created_at, profiles:created_by(username)")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const stats = [
    { label: "Chansons", value: songsCount ?? 0, icon: Music },
    { label: "Artistes", value: artistsCount ?? 0, icon: Guitar },
    { label: "Utilisateurs", value: usersCount ?? 0, icon: Users, sub: `${bannedCount ?? 0} banni(s)` },
    { label: "Partitions", value: sheetsCount ?? 0, icon: FileText },
  ]

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, sub }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  {sub && <p className="text-xs text-destructive">{sub}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Activité récente</h2>
        <Card>
          <CardContent className="pt-4">
            {recentSongs && recentSongs.length > 0 ? (
              <ul className="divide-y divide-border">
                {recentSongs.map((song) => {
                  const profile = Array.isArray(song.profiles) ? song.profiles[0] : song.profiles
                  return (
                    <li key={song.id} className="py-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{song.title}</p>
                        <p className="text-xs text-muted-foreground">
                          par {profile?.username ?? "inconnu"}
                        </p>
                      </div>
                      <time className="text-xs text-muted-foreground shrink-0">
                        {new Date(song.created_at).toLocaleDateString("fr-FR")}
                      </time>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground py-2">Aucune chanson récente.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
