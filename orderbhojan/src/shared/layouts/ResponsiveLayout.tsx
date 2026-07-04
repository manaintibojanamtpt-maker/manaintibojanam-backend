import { Outlet } from 'react-router-dom';
import { useBreakpoint } from '@bhojan/design-system';

export interface ResponsiveLayoutProps {
  maxWidth?: string;
  padding?: string;
}

export function ResponsiveLayout({ maxWidth = '72rem', padding = 'var(--bds-space-4)' }: ResponsiveLayoutProps) {
  const isTablet = useBreakpoint('md');
  const isDesktop = useBreakpoint('lg');

  return (
    <div
      style={{
        width: '100%',
        maxWidth,
        margin: '0 auto',
        padding,
        paddingBottom: isTablet ? 'var(--bds-space-8)' : 'var(--bds-space-6)',
      }}
      data-bds-viewport={isDesktop ? 'desktop' : isTablet ? 'tablet' : 'mobile'}
    >
      <Outlet />
    </div>
  );
}

export function FullScreenLayout() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bds-color-background)' }}>
      <Outlet />
    </div>
  );
}
