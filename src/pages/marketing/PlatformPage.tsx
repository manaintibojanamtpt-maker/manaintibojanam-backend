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
          title="For Restaurants — Run Everything with BhojanOS."
          subtitle="The operating platform for independent food businesses. Manage your storefront, menu, kitchen, orders, and customers — then connect directly with new customers through OrderBhojan."
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
