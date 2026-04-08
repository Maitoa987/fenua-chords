import Link from "next/link";
import { User, Music } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ArtistCardProps {
  name: string;
  slug: string;
  origin: string | null;
  songCount: number;
}

export function ArtistCard({ name, slug, origin, songCount }: ArtistCardProps) {
  return (
    <Link href={`/artistes/${slug}`} className="block">
      <Card className="hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading text-lg truncate">{name}</h3>
              {origin && <p className="text-sm text-muted-foreground">{origin}</p>}
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Music className="w-3.5 h-3.5" />
                {songCount} {songCount > 1 ? "chansons" : "chanson"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
