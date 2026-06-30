import React from 'react';
import { Section } from './ui/Section';
import { MarketingSoftCTA } from './marketing/MarketingSoftCTA';
import { SocialProofStrip } from './marketing/SocialProofStrip';

export const CallToAction: React.FC = () => {
  return (
    <Section background="gradient" density="spacious" className="border-t border-white/[0.06]">
      <div className="max-w-2xl mx-auto text-center relative z-10">
        <p className="marketing-section-eyebrow mb-4">Own your restaurant online</p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mb-3 leading-[1.12]">
          Your customers. Your brand. Your revenue.
        </h2>
        <p className="text-[15px] sm:text-base text-neutral-400 font-medium mb-7 max-w-xl mx-auto leading-relaxed">
          Launch your free storefront in minutes. 0% commission. No onboarding fee. Keep 100% of every direct order.
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md mx-auto sm:max-w-none">
          <MarketingSoftCTA to="/owner/register" className="marketing-soft-cta--block w-full sm:w-auto sm:min-w-[220px]">
            Start Free Storefront
          </MarketingSoftCTA>
          <MarketingSoftCTA to="/contact" tone="ghost" className="marketing-soft-cta--block w-full sm:w-auto sm:min-w-[160px]">
            Talk to us
          </MarketingSoftCTA>
        </div>
        <SocialProofStrip />
      </div>
    </Section>
  );
};
