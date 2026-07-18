import { Outlet } from 'react-router-dom';

/** Full-screen layout without marketplace chrome — restaurant menu, tracking, etc. */
export function FullScreenLayout() {
  return (
    <div
      className="ob-app-shell ob-fullscreen-shell min-h-[100dvh]"
      style={{ background: 'var(--bds-color-background)', color: 'var(--bds-color-text-primary)' }}
      data-bds-layout="fullscreen"
    >
      <Outlet />
    </div>
  );
}
