import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ArtistCard } from "@/components/ArtistCard";

export const metadata: Metadata = {
  title: "Artistes — Fenua Chords",
};

export default async function ArtistesPage() {
  const supabase = await createClient();

  const { data: artists } = await supabase
    .from("artists")
    .select("id, name, slug, origin, songs(count)")
    .order("name");

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-heading text-3xl text-text mb-8">Artistes</h1>
      {!artists || artists.length === 0 ? (
        <p className="text-text-muted">Aucun artiste pour le moment.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {artists.map((artist) => {
            const songCount =
              Array.isArray(artist.songs) && artist.songs.length > 0
                ? (artist.songs[0] as { count: number }).count
                : 0;
            return (
              <ArtistCard
                key={artist.id}
                name={artist.name}
                slug={artist.slug}
                origin={artist.origin}
                songCount={songCount}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
