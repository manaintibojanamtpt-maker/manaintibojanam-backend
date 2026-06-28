import React from 'react';
import { Section } from '../ui/Section';

interface MarketingPageHeroProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

/** Compact page title — use under fixed header (main has marketing-main-offset). */
export const MarketingPageHero: React.FC<MarketingPageHeroProps> = ({ title, subtitle, children }) => (
  <Section background="gradient" density="hero" className="text-center border-b border-white/[0.06]">
    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-3 leading-[1.1]">
      {title}
    </h1>
    {subtitle && (
      <p className="text-base sm:text-lg text-neutral-400 font-medium max-w-2xl mx-auto leading-relaxed">
        {subtitle}
      </p>
    )}
    {children && <div className="mt-8">{children}</div>}
  </Section>
);
