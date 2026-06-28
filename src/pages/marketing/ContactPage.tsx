import React from 'react';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { MarketingPageHero } from '../../components/marketing/MarketingPageHero';
import { EnterpriseSchema } from '../../components/EnterpriseSchema';

const ContactPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#030303] font-sans text-gray-100">
      <EnterpriseSchema />
      <EnterpriseHeader />
      <main className="flex-grow marketing-main-offset">
        <MarketingPageHero
          title="Get in Touch."
          subtitle="Whether you have a question about features, pricing, or anything else, our team is ready to answer all your questions."
        >
          <a
            href="mailto:support@bhojanos.com"
            className="inline-flex items-center justify-center bg-[#FF6B00] text-white font-bold py-3.5 px-8 rounded-xl hover:bg-[#E56D00] transition-colors shadow-[0_0_24px_rgba(255,107,0,0.25)] min-h-0 min-w-0"
          >
            Email Support
          </a>
        </MarketingPageHero>
      </main>
      <EnterpriseFooter />
    </div>
  );
};

export default ContactPage;
