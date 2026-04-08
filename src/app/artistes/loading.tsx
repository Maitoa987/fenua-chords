import { Skeleton } from "@/components/ui/skeleton";

export default function ArtistesLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Title skeleton */}
      <Skeleton className="h-9 w-36 mb-8" />

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-5 flex items-start gap-3">
            {/* Avatar circle */}
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
