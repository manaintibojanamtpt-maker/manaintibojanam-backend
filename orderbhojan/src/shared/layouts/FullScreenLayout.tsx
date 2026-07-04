import { Outlet } from 'react-router-dom';

/** Full-screen layout without marketplace chrome — for immersive flows (checkout, tracking). */
export function FullScreenLayout() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bds-color-background)', color: 'var(--bds-color-text-primary)' }} data-bds-layout="fullscreen">
      <Outlet />
    </div>
  );
}
