import { Outlet, useLocation } from 'react-router-dom';
import { LocationChip, LocationSelectorSheet, useLocationFeatureEnabled } from '@/features/location';
import { ExperienceBottomNav, MarketplaceFloatingCart } from '@/features/experience';
import { OrderBhojanBrand } from '@/shared/ui/OrderBhojanBrand';

function isHomeRoute(pathname: string): boolean {
  return pathname === '/';
}

export function MarketplaceLayout() {
  const { pathname } = useLocation();
  const onHome = isHomeRoute(pathname);
  const locationEnabled = useLocationFeatureEnabled();
  const showCompactHeader = !onHome || locationEnabled;

  return (
    <div className="ob-px2-marketplace bds-marketplace-with-sidenav">
      {showCompactHeader ? (
        <header
          className={`ob-px2-compact-header bds-glass-surface${onHome ? ' ob-px2-compact-header--home' : ''}`}
        >
          {!onHome ? (
            <OrderBhojanBrand variant="compact" />
          ) : null}
          {locationEnabled ? (
            <LocationChip
              variant="compact"
              className={onHome ? 'ob-px2-compact-header__location--home' : 'ob-compact-header__location'}
            />
          ) : null}
        </header>
      ) : null}

      <main className="ob-px2-main">
        <Outlet />
      </main>

      <ExperienceBottomNav />
      <MarketplaceFloatingCart />
      {locationEnabled ? <LocationSelectorSheet /> : null}
    </div>
  );
}
