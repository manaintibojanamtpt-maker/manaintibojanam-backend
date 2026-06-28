import React, { memo } from 'react';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { RevealOnScroll } from './RevealOnScroll';
import { builtForSegments } from '../../config/landing';

export const SocialProofGrid = memo(function SocialProofGrid() {
  return (
    <Section id="built-for" background="subtle" className="scroll-mt-24">
      <SectionHeader label="Built for" title="Every Type of Food Business" description="Cloud kitchens, dine-in restaurants, cafes, and QSR — one OS, your brand." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {builtForSegments.map(({ title, description }, i) => (
          <RevealOnScroll key={title} delay={i * 0.05}>
            <div className="group h-full rounded-[1.25rem] border border-white/[0.08] bg-[#0A0A0A] p-6 transition-all duration-300 hover:border-[#FF7A00]/25 hover:shadow-[0_0_28px_-12px_rgba(255,122,0,0.3)] hover:-translate-y-0.5">
              <div className="h-1 w-10 rounded-full bg-[#FF7A00]/60 mb-5 group-hover:w-14 transition-all duration-300" />
              <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </Section>
  );
});

export default SocialProofGrid;
