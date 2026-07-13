import React, { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import type { MarketplaceNavItem } from './types';

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

export interface MarketplaceBottomNavViewProps {
  items: readonly MarketplaceNavItem[];
  activePath: string;
  onNavigate: (path: string) => void;
  onHaptic?: (kind: 'light' | 'medium' | 'success') => void;
  activeOrderSlot?: React.ReactNode;
  scrollContainerId?: string;
  resolveActive?: (pathname: string, item: MarketplaceNavItem) => boolean;
}

const defaultResolveActive = (pathname: string, item: MarketplaceNavItem): boolean => {
  if (item.path === '/') {
    return pathname === '/' || pathname === '';
  }
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
};

export const MarketplaceBottomNavView: React.FC<MarketplaceBottomNavViewProps> = ({
  items,
  activePath,
  onNavigate,
  onHaptic,
  activeOrderSlot = null,
  scrollContainerId = 'main-scroll-container',
  resolveActive = defaultResolveActive,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      setIsVisible(true);
      return;
    }
    const mainContainer = document.getElementById(scrollContainerId);
    if (!mainContainer) return;

    let lastScrollY = mainContainer.scrollTop;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = mainContainer.scrollTop;
          const maxScroll = mainContainer.scrollHeight - mainContainer.clientHeight;

          if (currentScrollY <= 0 || currentScrollY >= maxScroll) {
            ticking = false;
            return;
          }

          if (currentScrollY > lastScrollY && currentScrollY > 60) {
            setIsVisible(false);
          } else if (currentScrollY < lastScrollY - 3) {
            setIsVisible(true);
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    mainContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainContainer.removeEventListener('scroll', handleScroll);
  }, [activePath, scrollContainerId, reducedMotion]);

  return (
    <AnimatePresence>
      <m.nav
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: reducedMotion || isVisible ? 0 : 100, opacity: reducedMotion || isVisible ? 1 : 0 }}
        transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 40 }}
        className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 pointer-events-none"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        aria-label="Primary"
      >
        {activeOrderSlot}
        <div className="max-w-lg mx-auto bg-black/80 dark:bg-[#121212]/90 backdrop-blur-3xl rounded-[2.5rem] px-2 py-2 flex items-center justify-around shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden pointer-events-auto">
          {items.map((item) => {
            const isActive = resolveActive(activePath, item);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (!isActive) {
                    onHaptic?.('light');
                    onNavigate(item.path);
                  }
                }}
                className="relative flex min-h-12 min-w-12 flex-col items-center justify-center px-2 py-1 group touch-manipulation"
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && !reducedMotion && (
                  <m.div
                    layoutId="obActiveBar"
                    className="absolute -bottom-1 w-1 h-1 bg-orange-500 rounded-full"
                    transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
                  />
                )}

                {isActive && reducedMotion ? (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-orange-500" aria-hidden />
                ) : null}

                <div className="relative z-10 flex flex-col items-center gap-1.5">
                  <m.div
                    animate={
                      reducedMotion
                        ? undefined
                        : {
                            y: isActive ? -2 : 0,
                            scale: isActive ? 1.15 : 1,
                          }
                    }
                    className={cn(
                      'transition-colors duration-300',
                      isActive ? 'text-orange-500' : 'text-white/55 group-active:text-white/75',
                    )}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </m.div>
                  <span
                    className={cn(
                      'text-[9px] font-bold tracking-[0.16em] uppercase transition-all duration-300',
                      isActive ? 'text-white' : 'text-white/50',
                    )}
                  >
                    {item.label}
                  </span>
                </div>

                {isActive && !reducedMotion ? (
                  <m.div
                    layoutId="obNavGlow"
                    className="absolute inset-0 bg-orange-500/5 blur-xl rounded-full"
                    transition={{ duration: 1 }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </m.nav>
    </AnimatePresence>
  );
};

export default MarketplaceBottomNavView;
