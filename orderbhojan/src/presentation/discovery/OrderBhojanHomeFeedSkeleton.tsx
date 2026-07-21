import { RecommendedSkeleton } from '@bhojan/storefront-design-system/skeleton/SkeletonSystem';

/** Above-the-fold skeleton only — hero renders instantly from cached shell. */
export function OrderBhojanHomeFeedSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading nearby kitchens">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
          <div className="h-2.5 w-40 animate-pulse rounded bg-white/5" />
        </div>
        <div className="h-2.5 w-12 animate-pulse rounded bg-white/5" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-3">
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
