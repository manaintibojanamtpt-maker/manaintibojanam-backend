import { useQuery } from '@tanstack/react-query';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { Skeleton } from '@bhojan/storefront-design-system/primitives/Skeleton';
import { SectionHeader } from '@bhojan/storefront-design-system/primitives/SectionHeader';
import { MarketplaceUxStateView } from '@bhojan/storefront-design-system/marketplace/MarketplaceUxStateView';
import { MarketplaceKitchenCardView } from '@bhojan/storefront-design-system/marketplace/MarketplaceKitchenCard';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { useFeatureFlags } from '@/featureFlags';
import { getAppConfig } from '@/config';
import { isFirebaseConfigured } from '@/firebase';
import { mapRestaurantPublicToKitchenCard } from '@/presentation/discovery/mapRestaurantToKitchenCard';

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
        <h1 className="bds-text-heading">M0 Foundation Status</h1>
        <p
          className="bds-text-body-sm"
          style={{ marginTop: 'var(--bds-space-1)', color: 'var(--bds-color-text-secondary)' }}
        >
          Infrastructure verification — BDS 1.0 certified shell, no marketplace business logic.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 'var(--bds-space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))' }}>
        <GlassCard hoverEffect={false}>
          <SectionHeader title="Environment" align="left" className="!mb-4 !text-left" />
          <dl style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-2)' }}>
            {[
              ['App environment', config.environment],
              ['Marketplace API', config.marketplaceApiBaseUrl],
              ['MSW enabled', String(config.features.mswEnabled)],
              ['Firebase configured', String(isFirebaseConfigured())],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--bds-space-4)' }}>
                <dt className="bds-text-body-sm">{label}</dt>
                <dd className="bds-text-body-sm" style={{ fontWeight: 600, textAlign: 'right' }}>{value}</dd>
              </div>
            ))}
          </dl>
        </GlassCard>

        <GlassCard hoverEffect={false}>
          <SectionHeader
            title="Feature Flags"
            description="All OFF by default"
            align="left"
            className="!mb-4 !text-left"
          />
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-1)' }}>
            {Object.entries(flags).map(([key, enabled]) => (
              <li key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="bds-text-body-sm">{key}</span>
                <span className="bds-text-body-sm" style={{ fontWeight: 600 }}>{enabled ? 'ON' : 'OFF'}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      <GlassCard hoverEffect={false}>
        <SectionHeader
          title="Mock Discover API"
          description="Proves HTTP client + MSW + TanStack Query wiring via storefront kitchen cards"
          align="left"
          className="!mb-4 !text-left"
        />
        {discoverQuery.isLoading ? (
          <div style={{ display: 'grid', gap: 'var(--bds-space-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))' }}>
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : discoverQuery.isError ? (
          <MarketplaceUxStateView
            role="alert"
            title="Discover mock failed"
            description="MSW or API client wiring issue."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-4)' }}>
            <p className="bds-text-body-sm" style={{ color: 'var(--bds-color-text-secondary)' }}>
              {discoverQuery.data?.locationLabel}
            </p>
            {discoverQuery.data?.collections.map((collection) => (
              <div key={collection.id}>
                <h3 className="bds-text-label" style={{ marginBottom: 'var(--bds-space-2)' }}>{collection.title}</h3>
                <div style={{ display: 'grid', gap: 'var(--bds-space-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))' }}>
                  {collection.restaurants.map((restaurant) => {
                    const kitchen = mapRestaurantPublicToKitchenCard(restaurant);
                    return (
                      <MarketplaceKitchenCardView
                        key={restaurant.restaurantId}
                        kitchen={kitchen}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
