import React from 'react';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { TrustSection } from '../../components/TrustSection';
import { EnterpriseSchema } from '../../components/EnterpriseSchema';
import { Section } from '../../components/ui/Section';

const SecurityPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#030303] font-sans text-gray-900 dark:text-gray-100">
      <EnterpriseSchema />
      <EnterpriseHeader />
      <main className="flex-grow marketing-main-offset">
        <Section background="gradient" className="pt-32 pb-16 text-center">
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tighter mb-6">
            Enterprise-Grade Security.
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 font-medium max-w-3xl mx-auto">
            Your data is isolated, encrypted, and protected by the same infrastructure that powers Google.
          </p>
        </Section>
        <TrustSection />
      </main>
      <EnterpriseFooter />
    </div>
  );
};

export default SecurityPage;
