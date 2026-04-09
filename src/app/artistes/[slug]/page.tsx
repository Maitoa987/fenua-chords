import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SongCard } from "@/components/SongCard";
import type { Style } from "@/types/database";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("name")
    .eq("slug", slug)
    .single();

  if (!artist) {
    return { title: "Artiste introuvable — Fenua Chords" };
  }

  return {
    title: `${artist.name} — Fenua Chords`,
  };
}

export default async function ArtistDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("id, name, slug, origin, bio")
    .eq("slug", slug)
    .single();

  if (!artist) {
    notFound();
  }

  const { data: songs } = await supabase
    .from("songs")
    .select("id, title, slug, style, original_key")
    .eq("artist_id", artist.id)
    .eq("status", "published")
    .order("title");

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link
        href="/artistes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Tous les artistes
      </Link>

      <div className="mb-8">
        <h1 className="font-heading text-3xl text-foreground">{artist.name}</h1>
        {artist.origin && (
          <p className="text-muted-foreground mt-1">{artist.origin}</p>
        )}
        {artist.bio && (
          <p className="text-muted-foreground mt-4 max-w-2xl">{artist.bio}</p>
        )}
      </div>

      <h2 className="font-heading text-xl text-foreground mb-4">Chansons</h2>
      {!songs || songs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Aucune chanson publiee pour le moment.</p>
          <Link
            href="/contribuer"
            className="text-primary hover:underline font-medium"
          >
            Ajouter les accords d&apos;une chanson de {artist.name}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {songs.map((song) => (
            <SongCard
              key={song.id}
              songId={song.id}
              title={song.title}
              slug={song.slug}
              artistName={artist.name}
              style={song.style as Style}
              originalKey={song.original_key}
            />
          ))}
        </div>
      )}
    </div>
  );
}
