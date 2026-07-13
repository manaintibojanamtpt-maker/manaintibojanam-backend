import { useCallback, useRef, useState, type ReactNode, type TouchEvent } from 'react';

const PULL_THRESHOLD_PX = 72;

export interface PullToRefreshProps {
  readonly onRefresh: () => void | Promise<void>;
  readonly children: ReactNode;
  readonly disabled?: boolean;
}

export function PullToRefresh({ onRefresh, children, disabled = false }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const finishRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh]);

  const onTouchStart = (event: TouchEvent) => {
    if (disabled || refreshing) return;
    const scrollTop = document.getElementById('main-scroll-container')?.scrollTop ?? window.scrollY;
    if (scrollTop > 4) return;
    startY.current = event.touches[0]?.clientY ?? 0;
    pulling.current = true;
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!pulling.current || disabled || refreshing) return;
    const currentY = event.touches[0]?.clientY ?? 0;
    const delta = Math.max(0, currentY - startY.current);
    setPullDistance(Math.min(delta, 120));
  };

  const onTouchEnd = () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= PULL_THRESHOLD_PX) {
      void finishRefresh();
      return;
    }
    setPullDistance(0);
  };

  const progress = Math.min(1, pullDistance / PULL_THRESHOLD_PX);

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden text-xs font-semibold text-white/50 transition-[height] duration-200"
        style={{ height: refreshing ? 40 : pullDistance * 0.6 }}
        aria-hidden={!refreshing && pullDistance < 8}
      >
        {refreshing ? 'Refreshing kitchens…' : progress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
      </div>
      {children}
    </div>
  );
}
