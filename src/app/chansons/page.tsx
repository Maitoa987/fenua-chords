import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SongCard } from "@/components/SongCard";
import { SearchBar } from "@/components/SearchBar";
import type { Style } from "@/types/database";

export const metadata: Metadata = {
  title: "Chansons — Fenua Chords",
};

const STYLES: { value: Style | "tous"; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "bringue", label: "Bringue" },
  { value: "himene", label: "Himene" },
  { value: "variete", label: "Variete" },
  { value: "traditionnel", label: "Traditionnel" },
  { value: "autre", label: "Autre" },
];

const SORTS: { value: string; label: string }[] = [
  { value: "title", label: "A — Z" },
  { value: "popular", label: "Les plus aimés" },
  { value: "recent", label: "Récents" },
];

interface Props {
  searchParams: Promise<{ q?: string; style?: string; sort?: string; page?: string }>;
}

export default async function ChansonPage({ searchParams }: Props) {
  const { q, style, sort, page } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // --- Pagination ---
  const PAGE_SIZE = 20;
  const currentPage = Math.max(1, Number(page) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // --- Search: if query matches an artist, find their song IDs ---
  let artistSongIds: string[] | null = null;
  if (q) {
    const { data: matchingArtists } = await supabase
      .from("artists")
      .select("id")
      .ilike("name", `%${q}%`);

    if (matchingArtists && matchingArtists.length > 0) {
      const artistIds = matchingArtists.map((a) => a.id);
      const { data: songArtists } = await supabase
        .from("song_artists")
        .select("song_id")
        .in("artist_id", artistIds);
      artistSongIds = (songArtists ?? []).map((sa) => sa.song_id);
    }
  }

  // --- Build query ---
  let query = supabase
    .from("songs")
    .select("id, title, slug, style, original_key, likes_count, song_artists(artists(name))", { count: "exact" })
    .eq("status", "published");

  if (q) {
    if (artistSongIds && artistSongIds.length > 0) {
      // Search by title OR by artist match
      query = query.or(`title.ilike.%${q}%,id.in.(${artistSongIds.join(",")})`);
    } else {
      query = query.ilike("title", `%${q}%`);
    }
  }

  if (style && style !== "tous") {
    query = query.eq("style", style);
  }

  // Tri
  if (sort === "popular") {
    query = query.order("likes_count", { ascending: false }).order("title");
  } else if (sort === "recent") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("title");
  }

  query = query.range(from, to);

  const { data: songs, count } = await query;

  let likedSongIds: Set<string> = new Set();
  if (user) {
    const { data: likes } = await supabase
      .from("likes")
      .select("song_id")
      .eq("user_id", user.id);
    likedSongIds = new Set((likes ?? []).map((l) => l.song_id));
  }

  const activeStyle = style ?? "tous";
  const activeSort = sort ?? "title";
  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  function buildFilterLink(styleValue: string, sortValue?: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (styleValue !== "tous") params.set("style", styleValue);
    const s = sortValue ?? activeSort;
    if (s !== "title") params.set("sort", s);
    const qs = params.toString();
    return `/chansons${qs ? `?${qs}` : ""}`;
  }

  function buildPageLink(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (activeStyle !== "tous") params.set("style", activeStyle);
    if (activeSort !== "title") params.set("sort", activeSort);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/chansons${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-heading text-3xl text-foreground mb-6">Chansons</h1>

      <Suspense>
        <SearchBar placeholder="Rechercher une chanson ou un artiste..." />
      </Suspense>

      <div className="flex flex-wrap gap-2 mt-6 mb-4">
        {STYLES.map(({ value, label }) => (
          <Link
            key={value}
            href={buildFilterLink(value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              activeStyle === value
                ? "bg-primary text-white border-primary"
                : "bg-card text-muted-foreground border-primary/20 hover:border-primary/40"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Sort options */}
      <div className="flex flex-wrap gap-2 mb-8">
        {SORTS.map(({ value, label }) => (
          <Link
            key={value}
            href={buildFilterLink(activeStyle, value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              activeSort === value
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border hover:border-foreground/30"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {!songs || songs.length === 0 ? (
        <p className="text-muted-foreground">Aucune chanson trouvée.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {songs.map((song) => {
              const songArtists = (song.song_artists as unknown as { artists: { name: string } }[]) ?? []
              const artistNames = songArtists.map((sa) => sa.artists.name)
              return (
                <SongCard
                  key={song.id}
                  songId={song.id}
                  title={song.title}
                  slug={song.slug}
                  artistNames={artistNames}
                  style={song.style as Style}
                  originalKey={song.original_key}
                  likesCount={(song as unknown as { likes_count: number }).likes_count ?? 0}
                  isLiked={likedSongIds.has(song.id)}
                />
              );
            })}
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
