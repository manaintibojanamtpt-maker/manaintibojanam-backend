import {
  CategorySkeleton,
  HomeBentoSkeleton,
  RecommendedSkeleton,
  TrendingSkeleton,
} from '@bhojan/storefront-design-system/skeleton/SkeletonSystem';
import { SectionHeader } from '@bhojan/storefront-design-system/primitives/SectionHeader';

export function OrderBhojanHomeFeedSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading home feed">
      <div>
        <SectionHeader title="Nearby kitchens" align="left" className="!mb-4 !text-left" />
        <div className="flex gap-4 overflow-hidden">
          <RecommendedSkeleton />
          <RecommendedSkeleton />
        </div>
      </div>
      <div>
        <SectionHeader title="Featured" align="left" className="!mb-4 !text-left" />
        <HomeBentoSkeleton />
      </div>
      <div>
        <SectionHeader title="Popular dishes" align="left" className="!mb-4 !text-left" />
        <div className="flex gap-4 overflow-hidden">
          <TrendingSkeleton />
          <TrendingSkeleton />
          <TrendingSkeleton />
        </div>
      </div>
    </div>
  );
}

export function OrderBhojanHomeCategorySkeleton() {
  return <CategorySkeleton />;
}
