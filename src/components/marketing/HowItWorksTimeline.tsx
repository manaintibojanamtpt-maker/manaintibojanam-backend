import React, { memo } from 'react';
import { m } from 'framer-motion';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { howItWorksSteps } from '../../config/landing';
import { OnboardCard } from '../ui/onboard-card';

export const HowItWorksTimeline = memo(function HowItWorksTimeline() {
  return (
    <Section id="how-it-works" background="subtle" className="scroll-mt-24 bg-[#111114] text-[#FAFAFA]">
      <SectionHeader
        label="How it works"
        title="From storefront to customer in six steps."
        description="A restaurant joins BhojanOS, builds its storefront, goes live on OrderBhojan, and starts receiving orders — all in one connected flow."
      />

      <div className="relative max-w-4xl mx-auto">
        {/* Connector line (desktop) */}
        <div
          className="hidden lg:block absolute top-7 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#D97706]/40 to-transparent"
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
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-sm bg-[#18181B] border border-[#D97706]/40 text-[#D97706] font-black text-lg mb-4 mx-auto shadow-none">
                {step.step}
              </div>
              <h3 className="text-base font-bold text-[#FAFAFA] mb-2">{step.title}</h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed max-w-xs mx-auto">{step.description}</p>
            </m.div>
          ))}
        </div>

        {/* Live Automated Verification Simulator */}
        <div className="mt-14 max-w-xl mx-auto rounded-2xl border border-[#27272A] bg-[#141417]/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-semibold uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Real-time Onboarding Verification</span>
          </div>
          <h4 className="text-lg sm:text-xl font-bold text-[#FAFAFA] mb-2">
            From Sign Up to First Order in 3 Minutes
          </h4>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mb-6 max-w-md mx-auto leading-relaxed">
            Watch BhojanOS instantly verify your restaurant, generate your direct ordering storefront, and launch your kitchen terminal.
          </p>

          <OnboardCard
            duration={3000}
            step1="Restaurant Profile & WhatsApp Linked"
            step2="Verifying UPI Bank Settlement Rails"
            step3="Kitchen Display Terminal (KDS) Live"
          />
        </div>
      </div>
    </Section>
  );
});

export default HowItWorksTimeline;
