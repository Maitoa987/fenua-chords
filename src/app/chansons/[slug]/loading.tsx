import { Skeleton } from "@/components/ui/skeleton"

export default function SongDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Skeleton className="h-4 w-36 mb-8" />
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-72 mb-6" />
      <div className="bg-card rounded-xl p-4 sm:p-6 space-y-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${60 + Math.random() * 40}%` }} />
        ))}
      </div>
    </div>
  )
}
