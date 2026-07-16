import { RecommendedSkeleton } from '@bhojan/storefront-design-system/skeleton/SkeletonSystem';
import { SectionHeader } from '@bhojan/storefront-design-system/primitives/SectionHeader';

/** Above-the-fold skeleton only — hero/categories render instantly from cached shell. */
export function OrderBhojanHomeFeedSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading nearby kitchens">
      <SectionHeader title="Nearby kitchens" align="left" className="!mb-2 !text-left" />
      <div className="flex gap-4 overflow-hidden">
        <RecommendedSkeleton />
        <RecommendedSkeleton />
      </div>
    </div>
  );
}

export function OrderBhojanHomeCategorySkeleton() {
  return null;
}
