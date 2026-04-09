import { Skeleton } from "@/components/ui/skeleton"

export default function ArtistDetailLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Skeleton className="h-4 w-32 mb-8" />
      <div className="mb-8">
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
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
  )
}
