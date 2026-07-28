/** Above-the-fold skeleton only — hero renders instantly from cached shell. */
export function OrderBhojanHomeFeedSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading nearby kitchens">
      <div className="flex items-center justify-between gap-3">
        <div className="h-4 w-36 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-12 animate-pulse rounded bg-white/5" />
      </div>
      <div className="divide-y divide-white/[0.06]">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 py-3">
            <div className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-white/10" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
              <div className="h-3 w-2/5 animate-pulse rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrderBhojanHomeCategorySkeleton() {
  return null;
}
