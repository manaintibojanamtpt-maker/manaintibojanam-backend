import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { pingBackend } from './services/api';

// Wake up the backend on initial load to reduce Razorpay cold starts
pingBackend();

import { TelemetryService } from './core/reliability/TelemetryService';

window.addEventListener('error', (event) => {
  TelemetryService.logError(event.error || event.message, { context: 'WindowError', route: window.location.pathname });
});

window.addEventListener('unhandledrejection', (event) => {
  TelemetryService.logError(`Unhandled Rejection: ${event.reason}`, { context: 'UnhandledRejection', route: window.location.pathname });
});

import { GlobalErrorBoundary } from './core/reliability/GlobalErrorBoundary';

// Service Worker is now registered automatically by vite-plugin-pwa via PwaUpdatePrompt component

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);
