import { Outlet } from 'react-router-dom';
import { useBreakpoint } from '@bhojan/design-system';

export function AuthLayout() {
  const isTablet = useBreakpoint('md');

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--bds-space-4)',
        background: 'var(--bds-color-background)',
      }}
      data-bds-layout="auth"
    >
      <div style={{ width: '100%', maxWidth: isTablet ? '28rem' : '100%' }}>
        <Outlet />
      </div>
    </div>
  );
}
