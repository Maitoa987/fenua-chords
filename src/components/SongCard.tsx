import Link from "next/link";
import { Guitar } from "lucide-react";
import { StyleBadge } from "./StyleBadge";
import type { Style } from "@/types/database";

interface SongCardProps {
  title: string;
  slug: string;
  artistName: string;
  style: Style;
  originalKey: string | null;
}

export function SongCard({ title, slug, artistName, style, originalKey }: SongCardProps) {
  return (
    <Link href={`/chansons/${slug}`} className="block bg-surface rounded-xl p-5 border border-primary/10 hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-heading text-lg text-text truncate">{title}</h3>
          <p className="text-sm text-text-muted">{artistName}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {originalKey && <span className="text-xs font-mono text-text-muted bg-bg px-2 py-0.5 rounded">{originalKey}</span>}
          <Guitar className="w-4 h-4 text-text-muted" />
        </div>
      </div>
      <div className="mt-3"><StyleBadge style={style} /></div>
    </Link>
  );
}
