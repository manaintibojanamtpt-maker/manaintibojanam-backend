import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from '@/app/App';
import { ensureAppConfig } from '@/config';
import { seedDiscoveryQueryCacheFromSession, resolveBootstrapDiscoveryCoords } from '@/features/discovery/engine/discoveryBootstrap';
import { hydrateDiscoverySessionCacheFromIdb } from '@/features/discovery/engine/discoverySessionCache';
import { isFirestorePermissionDenied } from '@/lib/firestoreErrors';
import { bootstrapCapacitorNative } from '@/lib/capacitorBootstrap';
import { isNativePlatform } from '@/lib/nativePlatform';
import { markPerf, markPerfOnce } from '@/lib/perfMarks';
import { trackEvent } from '@/telemetry';
import '@/styles/globals.css';

if (isNativePlatform()) {
  (window as Window & { __SKIP_SPLASH__?: boolean }).__SKIP_SPLASH__ = true;
}

function suppressFirestorePermissionRejections(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('unhandledrejection', (event) => {
    if (!isFirestorePermissionDenied(event.reason)) return;
    event.preventDefault();
    if (import.meta.env.DEV) {
      console.warn('[OrderBhojan] Suppressed Firestore permission rejection at bootstrap', event.reason);
    }
  });
}

function renderApp(): void {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element #root not found');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );

  document.getElementById('ob-boot-shell')?.remove();

  requestAnimationFrame(() => {
    markPerfOnce('first_paint');
  });
}

async function bootstrap() {
  markPerf('app_start');
  suppressFirestorePermissionRejections();

  await bootstrapCapacitorNative();

  const bootstrapCoords = resolveBootstrapDiscoveryCoords();
  if (bootstrapCoords) {
    await hydrateDiscoverySessionCacheFromIdb(bootstrapCoords.lat, bootstrapCoords.lng);
  }
  seedDiscoveryQueryCacheFromSession();

  const config = await ensureAppConfig();
  renderApp();

  if (config.features.mswEnabled) {
    try {
      const { startMockServiceWorker } = await import('@/marketplace-api/mocks/browser');
      await startMockServiceWorker();
    } catch (error) {
      console.warn('[OrderBhojan] MSW failed to start; continuing without mocks', error);
    }
  }

  trackEvent({ name: 'app_ready' });
}

bootstrap().catch((error) => {
  console.error('[OrderBhojan] bootstrap failed', error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `<div style="padding:2rem;font-family:system-ui;color:#fff;background:#070504;min-height:100vh"><h1>OrderBhojan failed to start</h1><p>${error instanceof Error ? error.message : String(error)}</p></div>`;
  }
});
