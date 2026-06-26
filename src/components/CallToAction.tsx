import React from 'react';
import { Section } from './ui/Section';
import { CTAButton } from './ui/CTAButton';

export const CallToAction: React.FC = () => {
  return (
    <Section background="gradient" className="border-t border-black/5 dark:border-white/5 py-32 sm:py-48">
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter mb-6 leading-[1.1]">
          Start taking direct orders today.
        </h2>
        <p className="text-lg sm:text-xl text-gray-400 font-medium mb-10 max-w-2xl mx-auto">
          Free storefront. Zero commission. No onboarding fee. Add your menu and share your link in minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <CTAButton to="/owner/register" variant="primary" className="w-full sm:w-auto min-w-[200px]">
            Create my free storefront
          </CTAButton>
          <CTAButton to="/contact" variant="outline" className="w-full sm:w-auto min-w-[200px]">
            Talk to us
          </CTAButton>
        </div>
      </div>
    </Section>
  );
};
