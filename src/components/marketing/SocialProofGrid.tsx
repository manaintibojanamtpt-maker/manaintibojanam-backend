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
            <div className="group h-full marketing-card p-5 transition-all duration-300 hover:border-[#FF7A00]/20">
              <div className="h-1 w-10 rounded-full bg-[#FF7A00]/60 mb-4 group-hover:w-12 transition-all duration-300" />
              <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </Section>
  );
});

export default SocialProofGrid;
