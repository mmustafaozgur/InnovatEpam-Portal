function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
      <div className="h-4 rounded animate-shimmer w-2/5" />
      <div className="h-5 rounded-full animate-shimmer w-20" />
      <div className="h-4 rounded animate-shimmer flex-1" />
      <div className="h-4 rounded animate-shimmer w-24" />
      <div className="h-4 rounded animate-shimmer w-1/6" />
    </div>
  )
}

export function IdeasTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border shadow-sm" aria-label="Loading ideas">
      <div className="bg-slate-50 px-4 py-3 border-b border-border" aria-hidden="true">
        <div className="flex gap-4">
          <div className="h-3 rounded animate-shimmer w-2/5" />
          <div className="h-3 rounded animate-shimmer w-1/5" />
          <div className="h-3 rounded animate-shimmer w-1/5" />
          <div className="h-3 rounded animate-shimmer w-1/5" />
          <div className="h-3 rounded animate-shimmer w-1/6" />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}
