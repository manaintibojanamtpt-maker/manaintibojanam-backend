import React, { Suspense, lazy, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EnterpriseHeader } from '../components/marketing/EnterpriseHeader';
import { MarketingHero } from '../components/marketing/MarketingHero';
import { EnterpriseFooter } from '../components/EnterpriseFooter';
import { EnterpriseSchema } from '../components/EnterpriseSchema';
import { useMarketingHashScroll } from '../hooks/useMarketingHashScroll';

const MarketingLandingSections = lazy(() => import('../components/marketing/MarketingLandingSections'));

const OnboardKitchen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  useMarketingHashScroll();

  useEffect(() => {
    if (location.hash === '#pricing') {
      navigate('/pricing', { replace: true });
      return;
    }
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [location.pathname, location.hash, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-[#030303] text-white font-sans selection:bg-[#FF7A00]/20 relative overflow-x-hidden">
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
