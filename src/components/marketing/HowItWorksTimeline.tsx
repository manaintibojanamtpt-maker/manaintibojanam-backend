import React, { memo } from 'react';
import { m } from 'framer-motion';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { howItWorksSteps } from '../../config/landing';

export const HowItWorksTimeline = memo(function HowItWorksTimeline() {
  return (
    <Section id="how-it-works" background="default" className="scroll-mt-24">
      <SectionHeader
        label="How it works"
        title="Launch in Minutes, Scale for Years"
        description="From storefront to payments to growth — five steps to own your restaurant online."
      />

      <div className="relative max-w-4xl mx-auto">
        <div
          className="hidden lg:block absolute top-8 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#FF7A00]/30 to-transparent"
          aria-hidden
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 lg:gap-3">
          {howItWorksSteps.map((step, i) => (
            <m.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className="relative text-center lg:text-left"
            >
              <div className="inline-flex lg:flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF7A00]/10 border border-[#FF7A00]/25 text-[#FF7A00] font-black text-lg mb-4 mx-auto lg:mx-0">
                {step.step}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">{step.description}</p>
            </m.div>
          ))}
        </div>
      </div>
    </Section>
  );
});

export default HowItWorksTimeline;
