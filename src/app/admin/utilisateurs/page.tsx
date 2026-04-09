import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { BanUserButton } from "./BanUserButton"
import { SearchBar } from "@/components/SearchBar"
import type { Profile } from "@/types/database"

interface Props {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>
}

const PAGE_SIZE = 50

export default async function AdminUsersPage({ searchParams }: Props) {
  const { q, filter, page } = await searchParams
  const supabase = await createClient()

  const currentPage = Math.max(1, Number(page) || 1)
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from("profiles")
    .select("id, username, role, is_banned, created_at", { count: "exact" })
    .order("created_at", { ascending: false })

  if (q) {
    query = query.ilike("username", `%${q}%`)
  }

  if (filter === "banned") {
    query = query.eq("is_banned", true)
  } else if (filter === "admin") {
    query = query.eq("role", "admin")
  }

  query = query.range(from, to)

  const { data: profiles, count } = await query
  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1

  const filterOptions = [
    { value: "tous", label: "Tous" },
    { value: "banned", label: "Bannis" },
    { value: "admin", label: "Admins" },
  ]
  const activeFilter = filter ?? "tous"

  function buildPageLink(p: number) {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (activeFilter !== "tous") params.set("filter", activeFilter)
    if (p > 1) params.set("page", String(p))
    const qs = params.toString()
    return `/admin/utilisateurs${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Utilisateurs ({count ?? profiles?.length ?? 0})</h2>

      <Suspense>
        <SearchBar placeholder="Rechercher un utilisateur..." />
      </Suspense>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map(({ value, label }) => {
          const params = new URLSearchParams()
          if (q) params.set("q", q)
          if (value !== "tous") params.set("filter", value)
          const qs = params.toString()
          return (
            <a
              key={value}
              href={`/admin/utilisateurs${qs ? `?${qs}` : ""}`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                activeFilter === value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:border-foreground/30"
              }`}
            >
              {label}
            </a>
          )
        })}
      </div>

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
          <p className="text-sm text-muted-foreground px-4 py-6">Aucun utilisateur trouvé.</p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          {currentPage > 1 && (
            <a
              href={buildPageLink(currentPage - 1)}
              className="px-4 py-2 rounded-lg text-sm border border-border bg-card hover:bg-muted transition-colors"
            >
              ← Précédent
            </a>
          )}
          <span className="text-sm text-muted-foreground">
            Page {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages && (
            <a
              href={buildPageLink(currentPage + 1)}
              className="px-4 py-2 rounded-lg text-sm border border-border bg-card hover:bg-muted transition-colors"
            >
              Suivant →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
