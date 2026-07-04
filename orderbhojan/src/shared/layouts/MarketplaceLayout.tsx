import { Link, Outlet, useLocation } from 'react-router-dom';

import { Icon, Text } from '@bhojan/design-system';

import { ExperienceBottomNav } from '@/features/experience';

import { LocationChip, LocationSelectorSheet, useLocationFeatureEnabled } from '@/features/location';



function isHomeRoute(pathname: string): boolean {

  return pathname === '/';

}



export function MarketplaceLayout() {

  const { pathname } = useLocation();

  const showCompactHeader = !isHomeRoute(pathname);

  const locationEnabled = useLocationFeatureEnabled();



  return (

    <div className="ob-marketplace-shell ob-m65-app">

      {showCompactHeader ? (

        <header className="ob-compact-header">

          <Link to="/" aria-label="OrderBhojan home" className="ob-compact-header__brand">

            <span className="ob-compact-header__logo">

              <Icon size={18} label="OrderBhojan">

                <path d="M12 3v18" />

                <path d="M3 12h18" />

              </Icon>

            </span>

            <Text variant="subtitle" as="span" style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>OrderBhojan</Text>

          </Link>

          {locationEnabled ? (

            <LocationChip variant="compact" className="ob-compact-header__location" />

          ) : null}

        </header>

      ) : null}



      <main className="ob-marketplace-main" data-bds-layout="marketplace">

        <Outlet />

      </main>



      <div className="ob-bottom-nav-fixed ob-m65-nav" aria-label="Primary navigation">

        <ExperienceBottomNav />

      </div>



      {locationEnabled ? <LocationSelectorSheet /> : null}

    </div>

  );

}

