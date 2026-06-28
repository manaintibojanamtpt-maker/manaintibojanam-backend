import React from 'react';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { PricingSection } from '../../components/pricing/PricingSection';
import { CallToAction } from '../../components/CallToAction';
import { EnterpriseSchema } from '../../components/EnterpriseSchema';
import { useMarketingHashScroll } from '../../hooks/useMarketingHashScroll';

const PricingPage: React.FC = () => {
  useMarketingHashScroll();

  return (
    <div className="min-h-screen flex flex-col bg-[#030303] font-sans text-gray-100">
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
