import React from 'react';
import { createRoot, Root } from 'react-dom/client';

let mounted = false;
let pwaRoot: Root | null = null;

/** Register service worker + show update banner on every app shell (marketing, owner auth, storefront). */
export async function mountPwaUpdatePrompt(): Promise<void> {
  if (mounted || typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  mounted = true;

  let host = document.getElementById('pwa-update-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'pwa-update-host';
    document.body.appendChild(host);
  }

  const { PwaUpdatePrompt } = await import('../components/PwaUpdatePrompt');
  pwaRoot = createRoot(host);
  pwaRoot.render(
    <React.StrictMode>
      <PwaUpdatePrompt />
    </React.StrictMode>,
  );
}
