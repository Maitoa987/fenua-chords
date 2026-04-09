import Link from "next/link";
import { Guitar } from "lucide-react";
import { StyleBadge } from "./StyleBadge";
import { Card, CardContent } from "@/components/ui/card";
import { AddToPlaylistButton } from "@/components/AddToPlaylistButton";
import type { Style } from "@/types/database";

interface SongCardProps {
  songId: string;
  title: string;
  slug: string;
  artistName: string;
  style: Style;
  originalKey: string | null;
}

export function SongCard({ songId, title, slug, artistName, style, originalKey }: SongCardProps) {
  return (
    <Card className="hover:border-primary/30 hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        <Link href={`/chansons/${slug}`} className="block">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-heading text-lg truncate">{title}</h3>
              <p className="text-sm text-muted-foreground">{artistName}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {originalKey && <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{originalKey}</span>}
              <Guitar className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <StyleBadge style={style} />
          <AddToPlaylistButton songId={songId} songTitle={title} variant="icon" />
        </div>
      </CardContent>
    </Card>
  );
}
