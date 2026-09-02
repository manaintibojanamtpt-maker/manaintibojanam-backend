import React, { memo } from 'react';
import { m } from 'framer-motion';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { howItWorksSteps } from '../../config/landing';

export const HowItWorksTimeline = memo(function HowItWorksTimeline() {
  return (
    <Section id="how-it-works" background="subtle" className="scroll-mt-24">
      <SectionHeader
        label="How it works"
        title="From storefront to customer in six steps."
        description="A restaurant joins BhojanOS, builds its storefront, goes live on OrderBhojan, and starts receiving orders — all in one connected flow."
      />

      <div className="relative max-w-4xl mx-auto">
        {/* Connector line (desktop) */}
        <div
          className="hidden lg:block absolute top-7 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#FF7A00]/30 to-transparent"
          aria-hidden
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-5">
          {howItWorksSteps.map((step, i) => (
            <m.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className="relative text-center"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0A0A0A] border border-[#FF7A00]/25 text-[#FF7A00] font-black text-lg mb-4 mx-auto shadow-[0_0_24px_-8px_rgba(255,122,0,0.4)]">
                {step.step}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-xs mx-auto">{step.description}</p>
            </m.div>
          ))}
        </div>
      </div>
    </Section>
  );
});

export default HowItWorksTimeline;
