export default function ChansonLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-pulse">
      {/* Title skeleton */}
      <div className="h-9 bg-primary/10 rounded-lg w-48 mb-6" />

      {/* Search bar skeleton */}
      <div className="h-10 bg-primary/10 rounded-xl w-full mb-6" />

      {/* Style filters skeleton */}
      <div className="flex flex-wrap gap-2 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 bg-primary/10 rounded-full w-24" />
        ))}
      </div>

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl p-5 border border-primary/10 space-y-3">
            <div className="h-5 bg-primary/10 rounded w-3/4" />
            <div className="h-4 bg-primary/10 rounded w-1/2" />
            <div className="h-5 bg-primary/10 rounded-full w-20 mt-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
