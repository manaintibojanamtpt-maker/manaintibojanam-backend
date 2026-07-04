import { Rail, Skeleton, Text } from '@bhojan/design-system';

export function RestaurantRailSkeleton({ title }: { title: string }) {
  return (
    <section className="ob-section ob-section--full ob-skeleton-premium" aria-label={`${title} loading`} aria-busy="true">
      <div className="ob-section__header">
        <Text variant="subtitle" as="h2" className="ob-section__title">{title}</Text>
      </div>
      <Rail>
        {[1, 2, 3].map((key) => (
          <div key={key} className="ob-skeleton-restaurant" style={{ width: '17.5rem' }}>
            <Skeleton height="10.5rem" />
            <Skeleton height="1rem" width="72%" style={{ marginTop: 'var(--bds-space-3)' }} />
            <Skeleton height="0.75rem" width="48%" style={{ marginTop: 'var(--bds-space-2)' }} />
          </div>
        ))}
      </Rail>
    </section>
  );
}

export function BannerSkeleton() {
  return (
    <Skeleton
      height="clamp(12rem, 38vw, 18rem)"
      className="ob-section ob-section--full"
      aria-label="Loading banner"
    />
  );
}

export function CategorySkeleton() {
  return (
    <Rail className="ob-skeleton-premium" aria-hidden>
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} width="5.75rem" height="4.5rem" style={{ borderRadius: 'var(--bds-radius-2xl)' }} />
      ))}
    </Rail>
  );
}

export function MenuSkeleton() {
  return (
    <div className="ob-skeleton-premium" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-4)' }} aria-busy="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} style={{ display: 'flex', gap: 'var(--bds-space-3)' }}>
          <Skeleton width="5.5rem" height="5.5rem" />
          <div style={{ flex: 1 }}>
            <Skeleton height="1rem" width="60%" />
            <Skeleton height="0.75rem" width="90%" style={{ marginTop: 'var(--bds-space-2)' }} />
            <Skeleton height="0.875rem" width="30%" style={{ marginTop: 'var(--bds-space-2)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
