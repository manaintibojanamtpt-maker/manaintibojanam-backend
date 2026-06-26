import React from 'react';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { PlatformOverview } from '../../components/PlatformOverview';
import { ProductOverview } from '../../components/ProductOverview';
import { TechnologyStack } from '../../components/TechnologyStack';
import { CallToAction } from '../../components/CallToAction';
import { EnterpriseSchema } from '../../components/EnterpriseSchema';
import { Section } from '../../components/ui/Section';

const PlatformPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#030303] font-sans text-gray-900 dark:text-gray-100">
      <EnterpriseSchema />
      <EnterpriseHeader />
      <main className="flex-grow marketing-main-offset">
        <Section background="gradient" className="pt-32 pb-16 text-center">
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tighter mb-6">
            The intelligent engine for your restaurant.
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 font-medium max-w-3xl mx-auto">
            A unified, cloud-native operating system designed to scale from a single cafe to a national franchise.
          </p>
        </Section>
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
