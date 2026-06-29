import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/system/ErrorBoundary';
import { dismissSplash } from './lib/splashScreen';
import { mountPwaUpdatePrompt } from './lib/mountPwaUpdatePrompt';
import './index.css';

const OwnerLogin = lazy(() => import('./pages/owner/OwnerLogin'));
const OwnerRegister = lazy(() => import('./pages/owner/OwnerRegister'));

const OwnerAuthFallback = () => (
  <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col items-center justify-center gap-3">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-orange-500" />
    <p className="text-sm text-white/50">Loading sign-in…</p>
  </div>
);

dismissSplash({ force: true });
void mountPwaUpdatePrompt();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<OwnerAuthFallback />}>
            <Routes>
              <Route path="/owner/login" element={<OwnerLogin />} />
              <Route path="/owner/register" element={<OwnerRegister />} />
              <Route path="*" element={<Navigate to="/owner/login" replace />} />
            </Routes>
          </Suspense>
          <Toaster position="top-center" />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
