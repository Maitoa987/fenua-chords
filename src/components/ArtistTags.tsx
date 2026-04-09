import Link from "next/link"

interface ArtistTagsProps {
  artists: { name: string; slug: string }[]
  className?: string
}

export function ArtistTags({ artists, className }: ArtistTagsProps) {
  if (artists.length === 0) return null

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      {artists.map((artist) => (
        <Link
          key={artist.slug}
          href={`/artistes/${artist.slug}`}
          className="inline-flex items-center bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-0.5 rounded-full text-sm font-medium transition-colors"
        >
          {artist.name}
        </Link>
      ))}
    </div>
  )
}
