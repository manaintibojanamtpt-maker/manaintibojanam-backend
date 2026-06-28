import React from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import { PlatformFeatures } from './PlatformFeatures';
import { CommissionComparison } from './CommissionComparison';
import { AIManagerSection } from './AIManagerSection';
import { OwnerDashboardPreview } from './OwnerDashboardPreview';
import { HowItWorksTimeline } from './HowItWorksTimeline';
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
      <AIManagerSection />
      <OwnerDashboardPreview />
      <HowItWorksTimeline />
      <SocialProofGrid />
      <ExecutiveLeadership />
      <LandingPricing />
      <LandingFAQ />
      <CallToAction />
    </LazyMotion>
  );
}
