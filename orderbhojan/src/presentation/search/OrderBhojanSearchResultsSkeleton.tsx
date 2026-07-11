import { RecommendedSkeleton, CategorySkeleton, Skeleton } from '@bhojan/storefront-design-system/skeleton/SkeletonSystem';

export function OrderBhojanSearchResultsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading search results">
      {Array.from({ length: 4 }).map((_, index) => (
        <RecommendedSkeleton key={index} />
      ))}
    </div>
  );
}

export function OrderBhojanSearchBrowseSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading browse suggestions">
      <Skeleton className="h-8 w-40 rounded-xl" />
      <CategorySkeleton />
      <Skeleton className="h-8 w-48 rounded-xl" />
      <CategorySkeleton />
    </div>
  );
}
