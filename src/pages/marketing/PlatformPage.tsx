import React from 'react';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { MarketingPageHero } from '../../components/marketing/MarketingPageHero';
import { PlatformOverview } from '../../components/PlatformOverview';
import { ProductOverview } from '../../components/ProductOverview';
import { TechnologyStack } from '../../components/TechnologyStack';
import { CallToAction } from '../../components/CallToAction';
import { EnterpriseSchema } from '../../components/EnterpriseSchema';

const PlatformPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#030303] font-sans text-gray-100">
      <EnterpriseSchema />
      <EnterpriseHeader />
      <main className="flex-grow marketing-main-offset">
        <MarketingPageHero
          title="The intelligent engine for your restaurant."
          subtitle="A unified, cloud-native operating system designed to scale from a single cafe to a national franchise."
        />
        <PlatformOverview />
        <ProductOverview />
        <TechnologyStack />
        <CallToAction />
      </main>
      <EnterpriseFooter />
    </div>
  );
};

export default PlatformPage;
