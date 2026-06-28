import React from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import { PlatformFeatures } from './PlatformFeatures';
import { CommissionComparison } from './CommissionComparison';
import { HowItWorksTimeline } from './HowItWorksTimeline';
import { OwnerDashboardPreview } from './OwnerDashboardPreview';
import { AIManagerSection } from './AIManagerSection';
import { SocialProofGrid } from './SocialProofGrid';
import { ExecutiveLeadership } from '../ExecutiveLeadership';
import { LandingPricing } from './LandingPricing';
import { LandingFAQ } from './LandingFAQ';
import { CallToAction } from '../CallToAction';

/** Below-the-fold landing sections — lazy-loaded so hero paints first. */
export default function MarketingLandingSections() {
  return (
    <LazyMotion features={domAnimation}>
      <PlatformFeatures />
      <CommissionComparison />
      <HowItWorksTimeline />
      <OwnerDashboardPreview />
      <AIManagerSection />
      <SocialProofGrid />
      <LandingPricing />
      <ExecutiveLeadership compact />
      <LandingFAQ />
      <CallToAction />
    </LazyMotion>
  );
}
