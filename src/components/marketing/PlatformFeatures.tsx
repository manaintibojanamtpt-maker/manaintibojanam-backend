import React, { memo } from 'react';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { RevealOnScroll } from './RevealOnScroll';
import { platformFeatures } from '../../config/landing';

export const PlatformFeatures = memo(function PlatformFeatures() {
  return (
    <Section id="features" background="subtle" className="scroll-mt-24">
      <SectionHeader
        label="Platform"
        title="Everything Your Restaurant Needs"
        description="One AI-powered operating system — not another ordering app. Own your storefront, kitchen, inventory, and customers."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {platformFeatures.map(({ icon: Icon, title, description }, i) => (
          <RevealOnScroll key={title} delay={i * 0.05}>
            <div className="group relative h-full rounded-[1.25rem] border border-white/[0.08] bg-[#0A0A0A]/80 p-6 transition-all duration-300 hover:border-[#FF7A00]/30 hover:shadow-[0_0_32px_-12px_rgba(255,122,0,0.35)] hover:-translate-y-1">
              <div className="absolute inset-0 rounded-[1.25rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#FF7A00]/10 via-transparent to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF7A00]/10 border border-[#FF7A00]/20 text-[#FF7A00] mb-5 group-hover:scale-105 transition-transform duration-300">
                  <Icon size={22} strokeWidth={2} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 tracking-tight">{title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
              </div>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </Section>
  );
});

export default PlatformFeatures;
