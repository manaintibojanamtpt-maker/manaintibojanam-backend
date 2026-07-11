import { Outlet, useLocation } from 'react-router-dom';
import { LocationChip, LocationSelectorSheet, DeliveryLocationWizard, useLocationFeatureEnabled } from '@/features/location';
import { OrderBhojanBottomNav, OrderBhojanFloatingCart } from '@/presentation/shell';
import { MarketplaceCompactHeaderView } from '@bhojan/storefront-design-system/adapters/marketplace/MarketplaceCompactHeaderView';
import { OrderBhojanBrand } from '@/shared/ui/OrderBhojanBrand';

function isHomeRoute(pathname: string): boolean {
  return pathname === '/';
}

export function MarketplaceLayout() {
  const { pathname } = useLocation();
  const onHome = isHomeRoute(pathname);
  const locationEnabled = useLocationFeatureEnabled();
  const showCompactHeader = !onHome;

  return (
    <div className="ob-px2-marketplace min-h-[100dvh] bg-[#070504] text-[#fffaf3]">
      {showCompactHeader ? (
        <MarketplaceCompactHeaderView
          brandSlot={<OrderBhojanBrand variant="compact" />}
          locationSlot={
            locationEnabled ? (
              <LocationChip variant="compact" className="ob-compact-header__location" />
            ) : null
          }
        />
      ) : null}

      <main
        id="main-scroll-container"
        className="ob-px2-main flex-1 relative"
        style={{
          paddingBottom: 'calc(140px + env(safe-area-inset-bottom))',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Outlet />
      </main>

      <OrderBhojanBottomNav />
      <OrderBhojanFloatingCart />

      {locationEnabled ? (
        <>
          <LocationSelectorSheet />
          <DeliveryLocationWizard />
        </>
      ) : null}
    </div>
  );
}
