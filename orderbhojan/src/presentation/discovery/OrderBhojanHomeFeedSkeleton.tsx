import { RecommendedSkeleton } from '@bhojan/storefront-design-system/skeleton/SkeletonSystem';

/** Above-the-fold skeleton only — hero renders instantly from cached shell. */
export function OrderBhojanHomeFeedSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading nearby kitchens">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-48 animate-pulse rounded bg-white/5" />
        </div>
        <div className="h-3 w-16 animate-pulse rounded bg-white/5" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <RecommendedSkeleton />
        <RecommendedSkeleton />
        <RecommendedSkeleton />
        <RecommendedSkeleton />
      </div>
    </div>
  );
}

export function OrderBhojanHomeCategorySkeleton() {
  return null;
}
