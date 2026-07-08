import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  RestaurantCard,
  Skeleton,
  Text,
} from '@bhojan/design-system';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { useFeatureFlags } from '@/featureFlags';
import { getAppConfig } from '@/config';
import { isFirebaseConfigured } from '@/firebase';

export function FoundationPage() {
  const config = getAppConfig();
  const { flags } = useFeatureFlags();

  const discoverQuery = useQuery({
    queryKey: ['marketplace', 'discovery', 'foundation'],
    queryFn: () =>
      getMarketplaceApiClient().discoveryHome({
        lat: 17.385,
        lng: 78.4867,
        limit: 3,
      }),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-6)' }}>
      <div>
        <Text variant="heading" as="h1">M0 Foundation Status</Text>
        <Text variant="bodySm" style={{ marginTop: 'var(--bds-space-1)', color: 'var(--bds-color-text-secondary)' }}>
          Infrastructure verification — BDS 1.0 certified shell, no marketplace business logic.
        </Text>
      </div>

      <div style={{ display: 'grid', gap: 'var(--bds-space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))' }}>
        <Card>
          <CardHeader>
            <CardTitle>Environment</CardTitle>
          </CardHeader>
          <dl style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-2)' }}>
            {[
              ['App environment', config.environment],
              ['Marketplace API', config.marketplaceApiBaseUrl],
              ['MSW enabled', String(config.features.mswEnabled)],
              ['Firebase configured', String(isFirebaseConfigured())],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--bds-space-4)' }}>
                <Text variant="bodySm" as="dt">{label}</Text>
                <Text variant="bodySm" as="dd" style={{ fontWeight: 600, textAlign: 'right' }}>{value}</Text>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Flags</CardTitle>
            <CardDescription>All OFF by default</CardDescription>
          </CardHeader>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-1)' }}>
            {Object.entries(flags).map(([key, enabled]) => (
              <li key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text variant="bodySm" as="span">{key}</Text>
                <Text variant="bodySm" as="span" style={{ fontWeight: 600 }}>{enabled ? 'ON' : 'OFF'}</Text>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mock Discover API</CardTitle>
          <CardDescription>Proves HTTP client + MSW + TanStack Query wiring via BDS RestaurantCard</CardDescription>
        </CardHeader>
        {discoverQuery.isLoading ? (
          <div style={{ display: 'grid', gap: 'var(--bds-space-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))' }}>
            <Skeleton height="10rem" />
            <Skeleton height="10rem" />
          </div>
        ) : discoverQuery.isError ? (
          <ErrorState title="Discover mock failed" description="MSW or API client wiring issue." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-4)' }}>
            <Text variant="bodySm" style={{ color: 'var(--bds-color-text-secondary)' }}>
              {discoverQuery.data?.locationLabel}
            </Text>
            {discoverQuery.data?.collections.map((collection) => (
              <div key={collection.id}>
                <Text variant="label" as="h3" style={{ marginBottom: 'var(--bds-space-2)' }}>{collection.title}</Text>
                <div style={{ display: 'grid', gap: 'var(--bds-space-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))' }}>
                  {collection.restaurants.map((restaurant) => (
                    <RestaurantCard
                      key={restaurant.restaurantId}
                      name={restaurant.displayName}
                      cuisine="Mock cuisine"
                      rating={restaurant.rating}
                      eta={`${restaurant.etaMinutes?.min ?? '—'} min`}
                      offer={restaurant.distanceKm ? `${restaurant.distanceKm} km` : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
