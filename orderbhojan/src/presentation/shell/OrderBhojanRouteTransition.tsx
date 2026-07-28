import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { OB_MOTION_EASE } from '@/features/experience/motion/premiumMotion';
import { isNativePlatform } from '@/lib/nativePlatform';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reduced;
}

function isFastFunnelTransition(from: string | null, to: string): boolean {
  const funnel = new Set(['/', '/cart', '/checkout', '/menu']);
  if (!from) return false;
  // Instant feel on conversion paths (web + native).
  if (funnel.has(from) && funnel.has(to)) return true;
  if (to.startsWith('/orders/') && to.endsWith('/track')) return true;
  if (from.startsWith('/orders/') && from.endsWith('/track') && to === '/') return true;
  return isNativePlatform() && from === '/cart' && to === '/checkout';
}

export function OrderBhojanRouteTransition() {
  const location = useLocation();
  const reducedMotion = usePrefersReducedMotion();
  const previousPathRef = useRef<string | null>(null);
  const fastFunnel = isFastFunnelTransition(previousPathRef.current, location.pathname);
  const skipMotion = reducedMotion || fastFunnel;

  useEffect(() => {
    previousPathRef.current = location.pathname;
  }, [location.pathname]);

  return (
    <AnimatePresence mode={fastFunnel ? 'sync' : 'wait'} initial={false}>
      <m.div
        key={location.pathname}
        initial={skipMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={skipMotion ? undefined : { opacity: 0, y: -4 }}
        transition={
          skipMotion
            ? { duration: 0 }
            : { duration: 0.16, ease: OB_MOTION_EASE }
        }
        className="min-h-0"
      >
        <Outlet />
      </m.div>
    </AnimatePresence>
  );
}
