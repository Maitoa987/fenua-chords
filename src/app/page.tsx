import Link from "next/link";
import { Music, Users, Guitar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SongCard } from "@/components/SongCard";
import { StyleBadge } from "@/components/StyleBadge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Style } from "@/types/database";

const STYLES: Style[] = ["bringue", "himene", "variete", "traditionnel", "autre"];

export default async function HomePage() {
  const supabase = await createClient();

  const [
    { count: songCount },
    { count: artistCount },
    { count: contributorCount },
    { data: recentSongs },
  ] = await Promise.all([
    supabase.from("songs").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("artists").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("songs")
      .select("id, title, slug, style, original_key, artists(name)")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-20 px-4 text-center">
        <h1 className="font-heading text-5xl sm:text-6xl text-foreground mb-4">Fenua Chords</h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Retrouve les accords de tes chants polynesiens preferes, partages par la communaute.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/chansons"
            className={cn(buttonVariants({ variant: "default", size: "lg" }))}
          >
            Explorer les chants
          </Link>
          <Link
            href="/contribuer"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Contribuer
          </Link>
        </div>
      </section>

      {/* Counters */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Music className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="font-heading text-4xl text-foreground">{songCount ?? 0}</p>
              <p className="text-muted-foreground mt-1">Chansons</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Guitar className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="font-heading text-4xl text-foreground">{artistCount ?? 0}</p>
              <p className="text-muted-foreground mt-1">Artistes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="font-heading text-4xl text-foreground">{contributorCount ?? 0}</p>
              <p className="text-muted-foreground mt-1">Contributeurs</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Styles */}
      <section className="max-w-5xl mx-auto px-4 pb-12">
        <h2 className="font-heading text-2xl text-foreground mb-4">Explorer par style</h2>
        <div className="flex flex-wrap gap-3">
          {STYLES.map((style) => (
            <Link key={style} href={`/chansons?style=${style}`}>
              <StyleBadge style={style} />
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Songs */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-2xl text-foreground">Ajouts recents</h2>
          <Link href="/chansons" className="text-sm text-primary hover:underline">
            Voir toutes les chansons
          </Link>
        </div>
        {!recentSongs || recentSongs.length === 0 ? (
          <p className="text-muted-foreground">Aucune chanson pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentSongs.map((song) => {
              const artistName = Array.isArray(song.artists)
                ? (song.artists[0] as { name: string })?.name ?? ""
                : (song.artists as { name: string } | null)?.name ?? "";
              return (
                <SongCard
                  key={song.id}
                  title={song.title}
                  slug={song.slug}
                  artistName={artistName}
                  style={song.style as Style}
                  originalKey={song.original_key}
                />
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
