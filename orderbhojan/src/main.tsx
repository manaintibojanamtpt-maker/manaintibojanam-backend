import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from '@/app/App';
import { ensureAppConfig } from '@/config';
import { trackEvent } from '@/telemetry';
import '@/styles/globals.css';
import '@/styles/experience-shell.css';
import '@/styles/experience-premium.css';
import '@/styles/experience-location.css';
import '@/styles/experience-discovery.css';
import '@/styles/experience-search.css';
import '@/styles/experience-restaurant.css';
import '@/styles/experience-food.css';
import '@/styles/experience-px2-layout.css';
import '@/styles/experience-premium-m65.css';
import '@/styles/experience-checkout.css';

async function bootstrap() {
  const config = await ensureAppConfig();

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
