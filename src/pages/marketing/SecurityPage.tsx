import React from 'react';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { MarketingPageHero } from '../../components/marketing/MarketingPageHero';
import { TrustSection } from '../../components/TrustSection';
import { EnterpriseSchema } from '../../components/EnterpriseSchema';

const SecurityPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#030303] font-sans text-gray-100">
      <EnterpriseSchema />
      <EnterpriseHeader />
      <main className="flex-grow marketing-main-offset">
        <MarketingPageHero
          title="Enterprise-Grade Security."
          subtitle="Your data is isolated, encrypted, and protected by the same infrastructure that powers Google."
        />
        <TrustSection variant="full" className="!pt-6 sm:!pt-8" />
      </main>
      <EnterpriseFooter />
    </div>
  );
};

export default SecurityPage;
