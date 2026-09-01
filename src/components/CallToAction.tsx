import React from 'react';
import { Section } from './ui/Section';
import { MarketingSoftCTA } from './marketing/MarketingSoftCTA';
import { SocialProofStrip } from './marketing/SocialProofStrip';
import { orderBhojanPublic } from '../config/demoData';
import { ShoppingBag } from 'lucide-react';

export const CallToAction: React.FC = () => {
  return (
    <Section background="gradient" density="spacious" className="border-t border-white/[0.06]">
      <div className="max-w-2xl mx-auto text-center relative z-10">
        <p className="marketing-section-eyebrow mb-4">One ecosystem. Every food business.</p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mb-3 leading-[1.12]">
          Run your restaurant with BhojanOS.
          <br />
          Let customers order through OrderBhojan.
        </h2>
        <p className="text-[15px] sm:text-base text-neutral-400 font-medium mb-7 max-w-xl mx-auto leading-relaxed">
          BhojanOS gives you everything to run, manage, and grow your food business.
          OrderBhojan connects you directly with customers — zero commission, complete ownership.
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md mx-auto sm:max-w-none">
          <MarketingSoftCTA to="/owner/register" className="marketing-soft-cta--block w-full sm:w-auto sm:min-w-[220px]">
            Start with BhojanOS
          </MarketingSoftCTA>
          <a
            href={orderBhojanPublic.homeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="marketing-soft-cta marketing-soft-cta--ghost soft-btn--ghost marketing-soft-cta--block w-full sm:w-auto sm:min-w-[220px]"
          >
            <span className="marketing-soft-cta-inner soft-btn__inner">
              <ShoppingBag size={16} aria-hidden />
              Order Food on OrderBhojan →
            </span>
          </a>
        </div>
        <SocialProofStrip />
      </div>
    </Section>
  );
};
