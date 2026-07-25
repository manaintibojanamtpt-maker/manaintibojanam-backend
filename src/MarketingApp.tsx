import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MarketingWhatsAppFloat } from './components/marketing/MarketingWhatsAppFloat';
import { MarketingAssistantRoot } from './features/assistant/ui/MarketingAssistantRoot';
import './marketing.css';

const OnboardKitchen = lazy(() => import('./pages/OnboardKitchen'));
const AboutPage = lazy(() => import('./pages/marketing/AboutPage'));
const PlatformPage = lazy(() => import('./pages/marketing/PlatformPage'));
const SecurityPage = lazy(() => import('./pages/marketing/SecurityPage'));
const ContactPage = lazy(() => import('./pages/marketing/ContactPage'));
const BlogPage = lazy(() => import('./pages/marketing/BlogPage'));
const PricingPage = lazy(() => import('./pages/marketing/PricingPage'));

const MarketingShell = () => (
  <div className="min-h-screen bg-[#030303] flex flex-col">
    <header className="h-16 border-b border-white/[0.06] bg-[#030303]/95 flex items-center px-4 sm:px-6">
      <div className="h-9 w-9 rounded-lg bg-white/[0.06] animate-pulse" />
      <div className="ml-3 h-4 w-28 rounded bg-white/[0.06] animate-pulse" />
    </header>
    <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-24 max-w-[1200px] mx-auto w-full">
      <div className="h-4 w-32 rounded bg-white/[0.06] animate-pulse mb-6" />
      <div className="h-12 w-full max-w-xl rounded bg-white/[0.06] animate-pulse mb-4" />
      <div className="h-12 w-full max-w-lg rounded bg-white/[0.06] animate-pulse mb-8" />
      <div className="h-11 w-44 rounded-xl bg-[#FF7A00]/20 animate-pulse" />
    </main>
  </div>
);

/** Prefetch common secondary routes after first paint for app-like nav. */
function prefetchMarketingRoutes() {
  const run = () => {
    void import('./pages/marketing/PricingPage');
    void import('./pages/marketing/AboutPage');
    void import('./pages/marketing/PlatformPage');
    void import('./pages/OnboardKitchen');
  };
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback(run, { timeout: 3500 });
  } else {
    window.setTimeout(run, 1500);
  }
}

/** Public marketing shell — no Firebase, cart, or owner/admin bundles. */
export default function MarketingApp() {
  React.useEffect(() => {
    prefetchMarketingRoutes();
  }, []);

  return (
    <BrowserRouter>
      <MarketingWhatsAppFloat />
      {/* Phase 8: flag-gated; returns null when VITE_FF_AI_MARKETING_ASSISTANT is OFF */}
      <MarketingAssistantRoot />
      <Suspense fallback={<MarketingShell />}>
        <Routes>
          <Route path="/" element={<OnboardKitchen />} />
          <Route path="/onboard" element={<OnboardKitchen />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/platform" element={<PlatformPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
