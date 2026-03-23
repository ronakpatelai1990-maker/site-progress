export function SkeletonCard() {
  return (
    <div className="card-elevated p-4 space-y-3">
      <div className="h-4 w-3/4 rounded-lg skeleton-shimmer" />
      <div className="h-3 w-1/2 rounded-lg skeleton-shimmer" />
      <div className="h-8 w-1/3 rounded-lg skeleton-shimmer" />
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="card-elevated p-4 space-y-2">
      <div className="h-10 w-10 rounded-xl skeleton-shimmer" />
      <div className="h-7 w-16 rounded-lg skeleton-shimmer" />
      <div className="h-3 w-12 rounded skeleton-shimmer" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-page-enter">
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <SkeletonStatCard key={i} />)}
      </div>
      <div className="space-y-3">
        {[1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
