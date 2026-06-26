import React from 'react';
import { Section } from './ui/Section';
import { SectionHeader } from './ui/SectionHeader';
import { TrustBadge } from './ui/TrustBadge';
import { trustIndicators } from '../config/trust';
import { CheckCircle2 } from 'lucide-react';

interface TrustSectionProps {
  variant?: 'full' | 'strip';
}

export const TrustSection: React.FC<TrustSectionProps> = ({ variant = 'full' }) => {
  if (variant === 'strip') {
    const stripItems = trustIndicators.slice(0, 4);

    return (
      <div className="border-y border-white/[0.06] bg-[#0A0A0A]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 text-center mb-5">
            Enterprise-grade platform foundations
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {stripItems.map((indicator) => (
              <div key={indicator} className="flex items-center gap-2 text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-[#FF6B00] shrink-0" strokeWidth={2.5} />
                <span className="text-xs sm:text-sm font-medium">{indicator}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Section background="subtle">
      <SectionHeader
        label="Security & Scale"
        title="Enterprise-Grade Reliability"
        description="Built on world-class cloud infrastructure to ensure your restaurant never goes offline during peak hours."
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {trustIndicators.map((indicator, i) => (
          <TrustBadge key={indicator} title={indicator} delay={i * 0.05} />
        ))}
      </div>
    </Section>
  );
};
