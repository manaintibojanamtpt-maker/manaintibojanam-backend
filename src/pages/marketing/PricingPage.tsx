import React, { useEffect } from 'react';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { PricingSection } from '../../components/pricing/PricingSection';
import { CallToAction } from '../../components/CallToAction';
import { EnterpriseSchema } from '../../components/EnterpriseSchema';
import { useMarketingHashScroll } from '../../hooks/useMarketingHashScroll';

const PricingPage: React.FC = () => {
  useMarketingHashScroll();

  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#09090B] font-sans text-[#FAFAFA] neone-dark">
      <EnterpriseSchema />
      <EnterpriseHeader />
      <main className="flex-grow marketing-main-offset">
        <PricingSection />
        <CallToAction />
      </main>
      <EnterpriseFooter />
    </div>
  );
};

export default PricingPage;
