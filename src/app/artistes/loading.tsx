export default function ArtistesLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-pulse">
      {/* Title skeleton */}
      <div className="h-9 bg-primary/10 rounded-lg w-36 mb-8" />

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl p-5 border border-primary/10 flex items-start gap-3">
            {/* Avatar circle */}
            <div className="w-10 h-10 rounded-full bg-primary/10 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-primary/10 rounded w-3/4" />
              <div className="h-4 bg-primary/10 rounded w-1/2" />
              <div className="h-4 bg-primary/10 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
