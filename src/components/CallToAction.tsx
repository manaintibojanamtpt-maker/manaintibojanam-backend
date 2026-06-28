import React from 'react';
import { Section } from './ui/Section';
import { CTAButton } from './ui/CTAButton';
import { MarketingSoftCTA } from './marketing/MarketingSoftCTA';

export const CallToAction: React.FC = () => {
  return (
    <Section background="gradient" density="spacious" className="border-t border-white/[0.06]">
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF7A00] mb-4">
          Own your restaurant online
        </p>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-4 leading-[1.12]">
          Your customers. Your brand. Your revenue.
        </h2>
        <p className="text-base sm:text-lg text-neutral-400 font-medium mb-8 max-w-2xl mx-auto">
          Launch your free storefront in minutes. 0% commission. No onboarding fee. Keep 100% of every direct order.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <MarketingSoftCTA to="/owner/register" className="marketing-soft-cta--block w-full sm:w-auto min-w-[220px]">
            Start Free Storefront
          </MarketingSoftCTA>
          <CTAButton to="/contact" variant="outline" className="w-full sm:w-auto min-w-[200px]">
            Talk to us
          </CTAButton>
        </div>
      </div>
    </Section>
  );
};
