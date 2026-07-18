import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { OB_MOTION_EASE } from '@/features/experience/motion/premiumMotion';

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

export function OrderBhojanRouteTransition() {
  const location = useLocation();
  const reducedMotion = usePrefersReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={location.pathname}
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
        transition={
          reducedMotion
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
