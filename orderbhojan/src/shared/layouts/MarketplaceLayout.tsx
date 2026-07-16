import { Outlet, useLocation } from 'react-router-dom';
import { LocationChip, useLocationFeatureEnabled } from '@/features/location';
import { OrderBhojanBottomNav, OrderBhojanFloatingCart } from '@/presentation/shell';
import { MarketplaceCompactHeaderView } from '@bhojan/storefront-design-system/adapters/marketplace/MarketplaceCompactHeaderView';
import { OrderBhojanBrand } from '@/shared/ui/OrderBhojanBrand';

function isHomeRoute(pathname: string): boolean {
  return pathname === '/';
}

function isFocusRoute(pathname: string): boolean {
  return (
    pathname.includes('/track') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/cart')
  );
}

export function MarketplaceLayout() {
  const { pathname } = useLocation();
  const onHome = isHomeRoute(pathname);
  const focusRoute = isFocusRoute(pathname);
  const locationEnabled = useLocationFeatureEnabled();
  const showCompactHeader = !onHome;
  const showChrome = !focusRoute;

  return (
    <div className="ob-app-shell ob-px2-marketplace flex h-[100dvh] flex-col bg-[#070504] text-[#fffaf3]">
      {showCompactHeader ? (
        <MarketplaceCompactHeaderView
          brandSlot={<OrderBhojanBrand variant="compact" />}
          locationSlot={
            locationEnabled ? (
              <LocationChip variant="compact" className="ob-compact-header__location touch-manipulation" />
            ) : null
          }
        />
      ) : null}

      <main
        id="main-scroll-container"
        className="ob-px2-main relative flex-1 overflow-y-auto overscroll-y-contain touch-pan-y"
        style={{
          paddingBottom: focusRoute ? 'var(--ob-focus-bottom)' : 'var(--ob-chrome-bottom)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Outlet />
      </main>

      {showChrome ? <OrderBhojanBottomNav /> : null}
      {showChrome ? <OrderBhojanFloatingCart /> : null}
    </div>
  );
}
