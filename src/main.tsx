import React from 'react';
import ReactDOM from 'react-dom/client';
import { dismissSplash, scheduleSplashSafetyTimeout, isMarketingPath } from './lib/splashScreen';
import { mountPwaUpdatePrompt } from './lib/mountPwaUpdatePrompt';

function isOwnerAuthPath(pathname?: string): boolean {
  if (typeof window === 'undefined') return false;
  const path = pathname ?? window.location.pathname;
  return path === '/owner/login' || path === '/owner/register';
}

dismissSplash();
scheduleSplashSafetyTimeout();

function clearBootFallback() {
  document.getElementById('boot-fallback')?.remove();
}

function showBootError() {
  dismissSplash({ force: true });
  const rootEl = document.getElementById('root');
  if (!rootEl) return;
  rootEl.innerHTML =
    '<div style="min-height:100dvh;background:#030303;color:#fff;display:flex;align-items:center;justify-content:center;padding:2rem;text-align:center;font-family:system-ui,sans-serif">' +
    '<div><p style="font-weight:700;margin-bottom:0.5rem">Unable to load BhojanOS</p>' +
    '<p style="color:#737373;font-size:14px;margin-bottom:1rem">Please check your connection and try again.</p>' +
    '<button type="button" onclick="location.reload()" style="padding:0.65rem 1.25rem;border-radius:0.75rem;border:none;background:#ff7a00;color:#fff;font-weight:600;cursor:pointer">Retry</button></div></div>';
}

async function bootstrap() {
  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  void mountPwaUpdatePrompt();

  if (isMarketingPath()) {
    const [{ default: MarketingApp }, { ErrorBoundary }] = await Promise.all([
      import('./MarketingApp'),
      import('./components/system/ErrorBoundary'),
    ]);

    clearBootFallback();
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <ErrorBoundary>
          <MarketingApp />
        </ErrorBoundary>
      </React.StrictMode>
    );
    return;
  }

  if (isOwnerAuthPath()) {
    clearBootFallback();
    await import('./ownerAuthBootstrap');
    return;
  }

  clearBootFallback();
  await import('./appBootstrap');
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap application:', error);
  showBootError();
});
