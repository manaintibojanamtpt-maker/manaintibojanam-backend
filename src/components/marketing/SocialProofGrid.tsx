import React, { memo } from 'react';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { RevealOnScroll } from './RevealOnScroll';
import { builtForSegments } from '../../config/landing';

export const SocialProofGrid = memo(function SocialProofGrid() {
  return (
    <Section id="built-for" background="subtle" className="scroll-mt-24 bg-[#111114] text-[#FAFAFA]">
      <SectionHeader label="Built for" title="Every Type of Food Business" description="Cloud kitchens, dine-in restaurants, cafes, and QSR — one OS, your brand." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {builtForSegments.map(({ title, description }, i) => (
          <RevealOnScroll key={title} delay={i * 0.05}>
            <div className="group h-full rounded-sm border border-[#27272A] bg-[#18181B] p-5 transition-all duration-300 hover:border-[#D97706]/40 hover:shadow-none">
              <div className="h-1 w-10 rounded-full bg-[#D97706]/60 mb-4 group-hover:w-12 transition-all duration-300" />
              <h3 className="text-base font-bold text-[#FAFAFA] mb-1.5">{title}</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">{description}</p>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </Section>
  );
});

export default SocialProofGrid;
