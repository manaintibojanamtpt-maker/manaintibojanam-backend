import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'rounded';
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className, 
  variant = 'rectangular' 
}) => {
  return (
    <div 
      className={cn(
        "shimmer bg-[#120d0c]/80",
        variant === 'circular' && "rounded-full",
        variant === 'rounded' && "rounded-2xl",
        className
      )}
    />
  );
};

export const MenuItemSkeleton = () => (
  <div className="relative flex justify-between gap-4 py-5 px-4 border-b border-white/[0.06] bg-[#120d0c] last:border-b-0">
    <div className="flex-1 min-w-0 pr-2 flex flex-col justify-start">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Skeleton className="h-4 w-4 rounded-[4px]" />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
      <Skeleton className="h-5 w-3/4 rounded-md mb-2" />
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-4 w-12 rounded" />
        <Skeleton className="h-4 w-10 rounded" />
      </div>
      <Skeleton className="h-3 w-full rounded mb-1" />
      <Skeleton className="h-3 w-2/3 rounded" />
    </div>
    <div className="relative flex flex-col items-center flex-shrink-0 ml-2">
      <Skeleton className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-2xl" />
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[85%]">
        <Skeleton className="h-9 w-full rounded-full" />
      </div>
    </div>
  </div>
);

export const CategorySkeleton = () => (
  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 p-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <Skeleton key={i} className="min-w-[80px] h-10 rounded-xl flex-shrink-0" />
    ))}
  </div>
);

export const RecommendedSkeleton = () => (
  <div className="flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-[#120d0c]/60 p-2.5">
    <Skeleton className="h-16 w-16 flex-shrink-0 rounded-xl" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-3.5 w-1/2 rounded" />
      <Skeleton className="h-2.5 w-1/4 rounded" />
      <Skeleton className="h-7 w-full rounded-lg" />
    </div>
  </div>
);

export const TrendingSkeleton = () => (
  <div className="flex-shrink-0 w-72 bg-[#120d0c]/60 rounded-2xl p-4 border border-white/[0.08] flex gap-4 items-center">
    <Skeleton className="w-24 h-24 rounded-2xl flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="h-3 w-1/2 rounded" />
    </div>
  </div>
);

export const HomeBentoSkeleton = () => (
  <div className="grid grid-cols-2 gap-3 mb-6">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-[#120d0c]/60 border border-white/[0.08] rounded-2xl p-2 flex flex-col">
        <Skeleton className="h-24 w-full rounded-xl mb-2" />
        <Skeleton className="h-4 w-3/4 rounded mb-2" />
        <div className="flex items-center justify-between mt-auto">
          <Skeleton className="h-5 w-12 rounded" />
          <Skeleton className="w-6 h-6 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

export const RestaurantHeroSkeleton = () => (
  <div className="space-y-0" aria-busy="true" aria-label="Loading restaurant">
    <Skeleton className="h-[min(160px,32vw)] min-h-[120px] max-h-[160px] w-full rounded-none" />
    <div className="relative z-10 mx-auto max-w-3xl px-4 -mt-10 space-y-3 pb-6">
      <Skeleton className="h-28 w-full rounded-[1.75rem]" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
    </div>
  </div>
);

export const RestaurantMenuPageSkeleton = () => (
  <div className="min-h-screen space-y-4" aria-busy="true" aria-label="Loading menu">
    <Skeleton className="mx-4 mt-4 h-14 rounded-2xl" />
    <div className="px-4">
      <CategorySkeleton />
    </div>
    <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#120d0c]">
      <MenuItemSkeleton />
      <MenuItemSkeleton />
      <MenuItemSkeleton />
    </div>
  </div>
);
