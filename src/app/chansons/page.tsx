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

interface Props {
  searchParams: Promise<{ q?: string; style?: string }>;
}

export default async function ChansonPage({ searchParams }: Props) {
  const { q, style } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("songs")
    .select("id, title, slug, style, original_key, song_artists(artists(name))")
    .eq("status", "published")
    .order("title");

  if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  if (style && style !== "tous") {
    query = query.eq("style", style);
  }

  const { data: songs } = await query;

  const activeStyle = style ?? "tous";

  function buildFilterLink(styleValue: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (styleValue !== "tous") params.set("style", styleValue);
    const qs = params.toString();
    return `/chansons${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-heading text-3xl text-foreground mb-6">Chansons</h1>

      <Suspense>
        <SearchBar />
      </Suspense>

      <div className="flex flex-wrap gap-2 mt-6 mb-8">
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

      {!songs || songs.length === 0 ? (
        <p className="text-muted-foreground">Aucune chanson trouvée.</p>
      ) : (
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
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
