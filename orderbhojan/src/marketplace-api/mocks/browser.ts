import { setupWorker } from 'msw/browser';
import { marketplaceHandlers } from '@/marketplace-api/mocks/handlers';

export async function startMockServiceWorker(): Promise<void> {
  const worker = setupWorker(...marketplaceHandlers);
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });
}
