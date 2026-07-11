import { Skeleton } from '@bhojan/storefront-design-system/primitives/Skeleton';

export function RestaurantRailSkeleton({ title }: { title: string }) {
  return (
    <section className="ob-section ob-section--full ob-skeleton-premium" aria-label={`${title} loading`} aria-busy="true">
      <div className="ob-section__header">
        <h2 className="bds-text-subtitle ob-section__title">{title}</h2>
      </div>
      <div className="bds-rail">
        {[1, 2, 3].map((key) => (
          <div key={key} className="ob-skeleton-restaurant" style={{ width: '17.5rem' }}>
            <Skeleton className="h-[10.5rem] w-full rounded-2xl" />
            <Skeleton className="mt-3 h-4 w-[72%] rounded-md" />
            <Skeleton className="mt-2 h-3 w-[48%] rounded-md" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function BannerSkeleton() {
  return (
    <Skeleton
      className="ob-section ob-section--full h-[clamp(12rem,38vw,18rem)] w-full rounded-2xl"
      aria-label="Loading banner"
    />
  );
}

export function CategorySkeleton() {
  return (
    <div className="bds-rail ob-skeleton-premium" aria-hidden>
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-[4.5rem] w-[5.75rem] rounded-[var(--bds-radius-2xl)]" />
      ))}
    </div>
  );
}

export function MenuSkeleton() {
  return (
    <div className="ob-skeleton-premium flex flex-col gap-4" aria-busy="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex gap-3">
          <Skeleton className="h-[5.5rem] w-[5.5rem] rounded-2xl" />
          <div className="flex-1">
            <Skeleton className="h-4 w-[60%] rounded-md" />
            <Skeleton className="mt-2 h-3 w-[90%] rounded-md" />
            <Skeleton className="mt-2 h-3.5 w-[30%] rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
