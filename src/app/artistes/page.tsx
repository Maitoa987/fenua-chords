import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ArtistCard } from "@/components/ArtistCard";
import { SearchBar } from "@/components/SearchBar";

export const metadata: Metadata = {
  title: "Artistes — Fenua Chords",
};

interface Props {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}

const SORTS: { value: string; label: string }[] = [
  { value: "name", label: "A — Z" },
  { value: "songs", label: "Plus de chansons" },
];

const PAGE_SIZE = 30;

export default async function ArtistesPage({ searchParams }: Props) {
  const { q, sort, page } = await searchParams;
  const supabase = await createClient();

  const currentPage = Math.max(1, Number(page) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("artists")
    .select("id, name, slug, origin, songs(count)", { count: "exact" });

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  query = query.order("name").range(from, to);

  const { data: artists, count } = await query;

  let sortedArtists = (artists ?? []).map((artist) => {
    const songCount =
      Array.isArray(artist.songs) && artist.songs.length > 0
        ? (artist.songs[0] as { count: number }).count
        : 0;
    return { ...artist, songCount };
  });

  if (sort === "songs") {
    sortedArtists = sortedArtists.sort((a, b) => b.songCount - a.songCount);
  }

  const activeSort = sort ?? "name";
  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  function buildPageLink(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (activeSort !== "name") params.set("sort", activeSort);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/artistes${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-heading text-3xl text-foreground mb-6">Artistes</h1>

      <Suspense>
        <SearchBar placeholder="Rechercher un artiste..." />
      </Suspense>

      {/* Sort options */}
      <div className="flex flex-wrap gap-2 mt-6 mb-8">
        {SORTS.map(({ value, label }) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (value !== "name") params.set("sort", value);
          const qs = params.toString();
          return (
            <a
              key={value}
              href={`/artistes${qs ? `?${qs}` : ""}`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                activeSort === value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:border-foreground/30"
              }`}
            >
              {label}
            </a>
          );
        })}
      </div>

      {sortedArtists.length === 0 ? (
        <p className="text-muted-foreground">Aucun artiste trouvé.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedArtists.map((artist) => (
              <ArtistCard
                key={artist.id}
                name={artist.name}
                slug={artist.slug}
                origin={artist.origin}
                songCount={artist.songCount}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2 mt-10" aria-label="Pagination">
              {currentPage > 1 && (
                <Link
                  href={buildPageLink(currentPage - 1)}
                  className="px-3 py-1.5 rounded-lg text-sm border border-border bg-card hover:bg-muted transition-colors"
                >
                  ← Précédent
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                  if (i > 0 && arr[i - 1] !== p - 1) acc.push("ellipsis");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === "ellipsis" ? (
                    <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
                  ) : (
                    <Link
                      key={item}
                      href={buildPageLink(item)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        currentPage === item
                          ? "bg-primary text-white border-primary"
                          : "border-border bg-card hover:bg-muted"
                      }`}
                    >
                      {item}
                    </Link>
                  )
                )}
              {currentPage < totalPages && (
                <Link
                  href={buildPageLink(currentPage + 1)}
                  className="px-3 py-1.5 rounded-lg text-sm border border-border bg-card hover:bg-muted transition-colors"
                >
                  Suivant →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
