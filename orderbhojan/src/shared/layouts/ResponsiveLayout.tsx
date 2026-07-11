import { Outlet } from 'react-router-dom';
import { useBreakpoint } from '@/shared/hooks/useMedia';

export interface ResponsiveLayoutProps {
  maxWidth?: string;
  padding?: string;
}

export function ResponsiveLayout({ maxWidth = '72rem', padding = '1rem' }: ResponsiveLayoutProps) {
  const breakpoint = useBreakpoint();
  const isTablet = breakpoint !== 'mobile';
  const isDesktop = breakpoint === 'desktop';

  return (
    <div
      className="mx-auto w-full"
      style={{
        maxWidth,
        padding,
        paddingBottom: isTablet ? '2rem' : '1.5rem',
      }}
      data-viewport={isDesktop ? 'desktop' : isTablet ? 'tablet' : 'mobile'}
    >
      <Outlet />
    </div>
  );
}

export function FullScreenLayout() {
  return (
    <div className="min-h-[100dvh] bg-[#070504] text-white">
      <Outlet />
    </div>
  );
}
