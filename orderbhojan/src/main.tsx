import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from '@/app/App';
import { getAppConfig } from '@/config';
import { validateAppConfig } from '@/config/validation';
import { trackEvent } from '@/telemetry';
import '@/styles/globals.css';
import '@/styles/experience-shell.css';
import '@/styles/experience-premium.css';
import '@/styles/experience-location.css';
import '@/styles/experience-discovery.css';
import '@/styles/experience-search.css';
import '@/styles/experience-restaurant.css';

async function bootstrap() {
  const config = getAppConfig();
  validateAppConfig(config);

  if (config.features.mswEnabled) {
    const { startMockServiceWorker } = await import('@/marketplace-api/mocks/browser');
    await startMockServiceWorker();
  }

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

  trackEvent({ name: 'app_ready' });
}

bootstrap().catch((error) => {
  console.error('[OrderBhojan] bootstrap failed', error);
});
