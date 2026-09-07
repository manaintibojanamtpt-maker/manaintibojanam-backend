import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MarketingWhatsAppFloat } from './components/marketing/MarketingWhatsAppFloat';
import { MarketingAssistantRoot } from './features/assistant/ui/MarketingAssistantRoot';
import './marketing.css';

// Existing Marketing Pages
const OnboardKitchen = lazy(() => import('./pages/OnboardKitchen'));
const AboutPage = lazy(() => import('./pages/marketing/AboutPage'));
const PlatformPage = lazy(() => import('./pages/marketing/PlatformPage'));
const SecurityPage = lazy(() => import('./pages/marketing/SecurityPage'));
const ContactPage = lazy(() => import('./pages/marketing/ContactPage'));
const BlogPage = lazy(() => import('./pages/marketing/BlogPage'));
const PricingPage = lazy(() => import('./pages/marketing/PricingPage'));

// Core Commercial Product Pages
const RestaurantOnlineOrderingPage = lazy(() => import('./pages/marketing/RestaurantOnlineOrderingPage'));
const DirectOrderingPlatformPage = lazy(() => import('./pages/marketing/DirectOrderingPlatformPage'));
const RestaurantManagementPage = lazy(() => import('./pages/marketing/RestaurantManagementPage'));
const RestaurantPosPage = lazy(() => import('./pages/marketing/RestaurantPosPage'));
const RestaurantBillingPage = lazy(() => import('./pages/marketing/RestaurantBillingPage'));
const QrOrderingPage = lazy(() => import('./pages/marketing/QrOrderingPage'));
const WhatsappOrderingPage = lazy(() => import('./pages/marketing/WhatsappOrderingPage'));
const RestaurantWebsitePage = lazy(() => import('./pages/marketing/RestaurantWebsitePage'));
const DigitalMenuPage = lazy(() => import('./pages/marketing/DigitalMenuPage'));
const DeliveryManagementPage = lazy(() => import('./pages/marketing/DeliveryManagementPage'));
const FeaturesPage = lazy(() => import('./pages/marketing/FeaturesPage'));
const IntegrationsPage = lazy(() => import('./pages/marketing/IntegrationsPage'));

// Solution Pages
const CloudKitchensSolutionPage = lazy(() => import('./pages/marketing/solutions/CloudKitchensSolutionPage'));
const CafesSolutionPage = lazy(() => import('./pages/marketing/solutions/CafesSolutionPage'));
const QsrSolutionPage = lazy(() => import('./pages/marketing/solutions/QsrSolutionPage'));
const SolutionsOverviewPage = lazy(() => import('./pages/marketing/solutions/SolutionsOverviewPage'));

// Competitor Comparison Pages
const ZomatoSwiggyComparePage = lazy(() => import('./pages/marketing/compare/ZomatoSwiggyComparePage'));
const DotpeComparePage = lazy(() => import('./pages/marketing/compare/DotpeComparePage'));
const PetpoojaComparePage = lazy(() => import('./pages/marketing/compare/PetpoojaComparePage'));

// Legal Pages
const PrivacyPolicyPage = lazy(() => import('./pages/marketing/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./pages/marketing/TermsOfServicePage'));
const RefundPolicyPage = lazy(() => import('./pages/marketing/RefundPolicyPage'));

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
    void import('./pages/marketing/RestaurantOnlineOrderingPage');
    void import('./pages/marketing/DirectOrderingPlatformPage');
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
          {/* Main Landing & Funnel */}
          <Route path="/" element={<OnboardKitchen />} />
          <Route path="/onboard" element={<OnboardKitchen />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/platform" element={<PlatformPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/blog" element={<BlogPage />} />

          {/* 1. Core Commercial Product Canonical Routes */}
          <Route path="/restaurant-online-ordering" element={<RestaurantOnlineOrderingPage />} />
          <Route path="/direct-ordering-platform" element={<DirectOrderingPlatformPage />} />
          <Route path="/restaurant-management-system" element={<RestaurantManagementPage />} />
          <Route path="/restaurant-pos" element={<RestaurantPosPage />} />
          <Route path="/restaurant-billing-software" element={<RestaurantBillingPage />} />
          <Route path="/qr-code-ordering-system" element={<QrOrderingPage />} />
          <Route path="/whatsapp-food-ordering-system" element={<WhatsappOrderingPage />} />
          <Route path="/restaurant-website-builder" element={<RestaurantWebsitePage />} />
          <Route path="/digital-menu-for-restaurants" element={<DigitalMenuPage />} />
          <Route path="/delivery-management-software" element={<DeliveryManagementPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />

          {/* 2. Solutions by Business Model Canonical Routes */}
          <Route path="/cloud-kitchen-software" element={<CloudKitchensSolutionPage />} />
          <Route path="/qsr-pos-software" element={<QsrSolutionPage />} />
          <Route path="/cafe-pos-billing-software" element={<CafesSolutionPage />} />
          <Route path="/solutions" element={<SolutionsOverviewPage />} />

          {/* 3. Competitor Comparison Canonical Routes */}
          <Route path="/bhojanos-vs-zomato-swiggy" element={<ZomatoSwiggyComparePage />} />
          <Route path="/petpooja-alternative" element={<PetpoojaComparePage />} />
          <Route path="/dotpe-alternative" element={<DotpeComparePage />} />

          {/* 4. Legal & Policies */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/refund-policy" element={<RefundPolicyPage />} />

          {/* 5. Legacy Route Aliases & 301-equivalent React Redirects */}
          <Route path="/restaurant-online-ordering-system" element={<Navigate to="/restaurant-online-ordering" replace />} />
          <Route path="/restaurant-management-software" element={<Navigate to="/restaurant-management-system" replace />} />
          <Route path="/qr-ordering" element={<Navigate to="/qr-code-ordering-system" replace />} />
          <Route path="/whatsapp-ordering" element={<Navigate to="/whatsapp-food-ordering-system" replace />} />
          <Route path="/restaurant-website" element={<Navigate to="/restaurant-website-builder" replace />} />
          <Route path="/digital-menu" element={<Navigate to="/digital-menu-for-restaurants" replace />} />
          <Route path="/restaurant-delivery-management" element={<Navigate to="/delivery-management-software" replace />} />
          <Route path="/solutions/restaurants" element={<Navigate to="/solutions" replace />} />
          <Route path="/solutions/cloud-kitchens" element={<Navigate to="/cloud-kitchen-software" replace />} />
          <Route path="/solutions/cafes" element={<Navigate to="/cafe-pos-billing-software" replace />} />
          <Route path="/solutions/qsr" element={<Navigate to="/qsr-pos-software" replace />} />
          <Route path="/solutions/food-businesses" element={<Navigate to="/solutions" replace />} />
          <Route path="/compare/bhojanos-vs-zomato" element={<Navigate to="/bhojanos-vs-zomato-swiggy" replace />} />
          <Route path="/compare/bhojanos-vs-swiggy" element={<Navigate to="/bhojanos-vs-zomato-swiggy" replace />} />
          <Route path="/compare/bhojanos-vs-petpooja" element={<Navigate to="/petpooja-alternative" replace />} />
          <Route path="/compare/bhojanos-vs-dotpe" element={<Navigate to="/dotpe-alternative" replace />} />
          <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
          <Route path="/cancellation-policy" element={<Navigate to="/refund-policy" replace />} />

          {/* Fallback to 404 handler or Root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
