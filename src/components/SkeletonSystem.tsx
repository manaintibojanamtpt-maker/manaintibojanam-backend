import React from 'react';
import { cn } from '../lib/utils';

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
        "shimmer bg-gray-200 dark:bg-white/[0.05]",
        variant === 'circular' && "rounded-full",
        variant === 'rounded' && "rounded-2xl",
        className
      )}
    />
  );
};

export const MenuItemSkeleton = () => (
  <div className="relative flex justify-between gap-4 py-5 px-4 border-b border-gray-100 dark:border-white/5 last:border-b-0">
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
  <div className="flex gap-6 items-center bg-gray-50 dark:bg-white/5 p-6 rounded-2xl border border-gray-100 dark:border-white/10">
    <Skeleton className="w-32 h-32 rounded-2xl flex-shrink-0" />
    <div className="flex-1 space-y-3">
      <Skeleton className="h-6 bg-gray-200 dark:bg-white/10 rounded w-1/2" />
      <Skeleton className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/4" />
      <Skeleton className="h-10 bg-gray-200 dark:bg-white/10 rounded w-full" />
    </div>
  </div>
);

export const TrendingSkeleton = () => (
  <div className="flex-shrink-0 w-72 bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/10 flex gap-4 items-center">
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
      <div key={i} className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-2 flex flex-col">
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
