import React, { memo } from 'react';
import { m } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { PricingPlanCard } from '../pricing/PricingPlanCard';
import { ALL_PLANS, PRICING_ZERO_COMMISSION_NOTE, pricingPageCopy } from '../../config/pricing';

const landingPlans = ALL_PLANS.map((plan) => ({
  ...plan,
  highlighted: plan.id === 'growth',
  badge:
    plan.id === 'growth'
      ? 'Recommended'
      : plan.id === 'pro'
        ? undefined
        : plan.badge,
}));

export const LandingPricing = memo(function LandingPricing() {
  return (
    <Section id="pricing" background="gradient" className="scroll-mt-24">
      <SectionHeader
        label="Pricing"
        title="Free Storefront. Growth for Live Orders."
        description="Build for free. Publish to accept orders with a 14-day Growth trial. Zero commission on every direct order."
      />

      <p className="text-center text-sm font-semibold text-[#ffb347]/90 mb-2">{pricingPageCopy.landing.trialBanner}</p>
      <p className="text-center text-sm font-semibold text-emerald-400/90 mb-6 sm:mb-8">{PRICING_ZERO_COMMISSION_NOTE}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-4 items-stretch mb-6">
        {landingPlans.map((plan, i) => (
          <m.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
          >
            <PricingPlanCard plan={plan} variant="landing" />
          </m.div>
        ))}
      </div>

      <p className="text-center">
        <Link
          to="/pricing"
          className="text-sm font-semibold text-[#FF7A00] hover:text-[#ff9533] transition-colors underline-offset-4 hover:underline"
        >
          View full plan comparison →
        </Link>
      </p>
    </Section>
  );
});

export default LandingPricing;
