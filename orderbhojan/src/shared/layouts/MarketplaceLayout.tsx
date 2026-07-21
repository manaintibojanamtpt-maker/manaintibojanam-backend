import { useLocation } from 'react-router-dom';
import {
  OrderBhojanBottomNav,
  OrderBhojanFloatingCart,
  OrderBhojanRouteTransition,
  OrderBhojanScreenHeader,
} from '@/presentation/shell';

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
  // Focus routes use OrderBhojanScreenHeader for title/back; page shells pass embedded.
  const showCompactHeader = !onHome;
  const showChrome = !focusRoute;

  return (
    <div className="ob-app-shell ob-px2-marketplace flex h-[100dvh] flex-col bg-[#070504] text-[#fffaf3]">
      {showCompactHeader ? (
        <OrderBhojanScreenHeader />
      ) : null}

      <main
        id="main-scroll-container"
        className="ob-px2-main relative flex-1 overflow-y-auto overscroll-y-contain touch-pan-y scrollbar-hide"
        style={{
          paddingBottom: focusRoute ? 'var(--ob-focus-bottom)' : 'var(--ob-chrome-bottom)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <OrderBhojanRouteTransition />
      </main>

      {showChrome ? <OrderBhojanBottomNav /> : null}
      {showChrome ? <OrderBhojanFloatingCart /> : null}
    </div>
  );
}
