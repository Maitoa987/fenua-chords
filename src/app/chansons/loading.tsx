import { Skeleton } from "@/components/ui/skeleton";

export default function ChansonLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Title skeleton */}
      <Skeleton className="h-9 w-48 mb-6" />

      {/* Search bar skeleton */}
      <Skeleton className="h-10 w-full mb-6" />

      {/* Style filters skeleton */}
      <div className="flex flex-wrap gap-2 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-5 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-5 w-20 rounded-full mt-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
