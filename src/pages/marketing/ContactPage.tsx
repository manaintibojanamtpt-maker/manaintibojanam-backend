import React from 'react';
import { EnterpriseHeader } from '../../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../../components/EnterpriseFooter';
import { EnterpriseSchema } from '../../components/EnterpriseSchema';
import { Section } from '../../components/ui/Section';

const ContactPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#030303] font-sans text-gray-900 dark:text-gray-100">
      <EnterpriseSchema />
      <EnterpriseHeader />
      <main className="flex-grow pt-20">
        <Section background="gradient" className="pt-32 pb-32 text-center">
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tighter mb-6">
            Get in Touch.
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 font-medium max-w-2xl mx-auto mb-12">
            Whether you have a question about features, pricing, or anything else, our team is ready to answer all your questions.
          </p>
          <a href="mailto:support@bhojanos.com" className="inline-block bg-[#FF6B00] text-white font-bold py-4 px-8 rounded-2xl hover:bg-[#e66000] transition-colors shadow-[0_0_30px_rgba(255,107,0,0.3)]">
            Email Support
          </a>
        </Section>
      </main>
      <EnterpriseFooter />
    </div>
  );
};

export default ContactPage;
