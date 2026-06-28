import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { FeatureFlagProvider } from './context/FeatureFlagContext';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { CartProvider } from './context/CartContext';
import { dismissSplash, scheduleSplashSafetyTimeout } from './lib/splashScreen';
import { TelemetryService } from './core/reliability/TelemetryService';
import { ErrorBoundary } from './components/system/ErrorBoundary';

dismissSplash();
scheduleSplashSafetyTimeout();

import('./services/api').then(({ pingBackend }) => pingBackend());
import('./lib/monitoring').then(({ initializeMonitoring }) => initializeMonitoring());

window.addEventListener('error', (event) => {
  TelemetryService.logError(event.error || event.message, { context: 'WindowError', route: window.location.pathname });
});

window.addEventListener('unhandledrejection', (event) => {
  TelemetryService.logError(`Unhandled Rejection: ${event.reason}`, { context: 'UnhandledRejection', route: window.location.pathname });
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <FeatureFlagProvider>
          <AuthProvider>
            <TenantProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </TenantProvider>
          </AuthProvider>
        </FeatureFlagProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
