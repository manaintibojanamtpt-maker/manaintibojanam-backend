import React, { Suspense, lazy, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { EnterpriseHeader } from '../components/marketing/EnterpriseHeader';
import { MarketingHero } from '../components/marketing/MarketingHero';
import { EnterpriseFooter } from '../components/EnterpriseFooter';
import { EnterpriseSchema } from '../components/EnterpriseSchema';
import { useMarketingHashScroll } from '../hooks/useMarketingHashScroll';

const MarketingLandingSections = lazy(() => import('../components/marketing/MarketingLandingSections'));

const OnboardKitchen: React.FC = () => {
  const location = useLocation();
  useMarketingHashScroll();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#09090B] text-[#FAFAFA] font-sans selection:bg-[#D97706]/30 selection:text-white relative overflow-x-hidden neone-dark">
      <EnterpriseSchema />
      <EnterpriseHeader />

      <main className="flex-grow">
        <MarketingHero />
        <Suspense fallback={null}>
          <MarketingLandingSections />
        </Suspense>
      </main>

      <EnterpriseFooter />
    </div>
  );
};

export default OnboardKitchen;
