import React from 'react';
import ReactDOM from 'react-dom/client';

async function start() {
  const { default: MarketingApp } = await import('./MarketingApp');
  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  document.getElementById('boot-fallback')?.remove();

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <MarketingApp />
    </React.StrictMode>
  );
}

start().catch((error) => {
  console.error('Marketing bootstrap failed:', error);
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML =
      '<div style="min-height:100dvh;background:#030303;color:#fff;display:flex;align-items:center;justify-content:center;padding:2rem;text-align:center;font-family:system-ui,sans-serif">' +
      '<div><p style="font-weight:700;margin-bottom:0.5rem">Unable to load page</p>' +
      '<button type="button" onclick="location.reload()" style="margin-top:1rem;padding:0.65rem 1.25rem;border-radius:0.75rem;border:none;background:#ff7a00;color:#fff;font-weight:600;cursor:pointer">Retry</button></div></div>';
  }
});
