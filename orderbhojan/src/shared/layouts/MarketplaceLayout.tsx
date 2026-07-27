import { useLocation } from 'react-router-dom';
import { useAiPersonalizationFeature } from '@/features/assistant/hooks/useAiPersonalizationFeature';
import { useAiPostOrderFeature } from '@/features/assistant/hooks/useAiPostOrderFeature';
import { ConsumerAssistantEntry } from '@/features/assistant/ui';
import { PersonalizationBootstrapSync } from '@/features/assistant/ui/PersonalizationBootstrapSync';
import {
  OrderBhojanBottomNav,
  OrderBhojanFloatingCart,
  OrderBhojanRouteTransition,
  OrderBhojanScreenHeader,
} from '@/presentation/shell';

function isHomeRoute(pathname: string): boolean {
  return pathname === '/';
}

function isTrackRoute(pathname: string): boolean {
  return pathname.includes('/track');
}

function isFocusRoute(pathname: string): boolean {
  return (
    isTrackRoute(pathname) ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/cart')
  );
}

export function MarketplaceLayout() {
  const { pathname } = useLocation();
  const postOrderEnabled = useAiPostOrderFeature();
  const personalizationEnabled = useAiPersonalizationFeature();
  const onHome = isHomeRoute(pathname);
  const focusRoute = isFocusRoute(pathname);
  const onTrack = isTrackRoute(pathname);
  // Focus routes use OrderBhojanScreenHeader for title/back; page shells pass embedded.
  const showCompactHeader = !onHome;
  const showChrome = !focusRoute;
  // Track pages: post-order triage and/or reorder personalization (still no cart/checkout chrome).
  const showAssistant =
    showChrome || (onTrack && (postOrderEnabled || personalizationEnabled));

  return (
    <div className="ob-app-shell ob-px2-marketplace flex h-[100dvh] flex-col bg-[#050403] text-[#fff8f0]">
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
      {personalizationEnabled ? <PersonalizationBootstrapSync /> : null}
      {/* Entry returns null when FF_OB_AI_ASSISTANT is OFF */}
      {showAssistant ? <ConsumerAssistantEntry /> : null}
    </div>
  );
}
