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

function isFastNativeCheckoutTransition(from: string | null, to: string): boolean {
  return isNativePlatform() && from === '/cart' && to === '/checkout';
}

export function OrderBhojanRouteTransition() {
  const location = useLocation();
  const reducedMotion = usePrefersReducedMotion();
  const previousPathRef = useRef<string | null>(null);
  const fastCheckout = isFastNativeCheckoutTransition(previousPathRef.current, location.pathname);
  const skipMotion = reducedMotion || fastCheckout;

  useEffect(() => {
    previousPathRef.current = location.pathname;
  }, [location.pathname]);

  return (
    <AnimatePresence mode={fastCheckout ? 'sync' : 'wait'} initial={false}>
      <m.div
        key={location.pathname}
        initial={skipMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={skipMotion ? undefined : { opacity: 0, y: -6 }}
        transition={
          skipMotion
            ? { duration: 0 }
            : { duration: 0.24, ease: OB_MOTION_EASE }
        }
        className="min-h-0"
      >
        <Outlet />
      </m.div>
    </AnimatePresence>
  );
}
