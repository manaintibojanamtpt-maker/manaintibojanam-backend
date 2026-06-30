import React, { memo, lazy, Suspense } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { CommandCenterPreview } from './CommandCenterPreview';
import { RevealOnScroll } from './RevealOnScroll';

const LiveDashboardPreview = lazy(() =>
  import('./LiveDashboardPreview').then((m) => ({ default: m.LiveDashboardPreview }))
);

export const OwnerDashboardPreview = memo(function OwnerDashboardPreview() {
  return (
    <Section id="dashboard-preview" background="subtle" className="scroll-mt-24">
      <SectionHeader
        label="Product preview"
        title="Production-Grade SaaS for Restaurant Operators"
        description="Revenue, kitchen queue, demand forecasts, and customer intelligence — one command center your team actually uses."
      />

      <RevealOnScroll>
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
          Owner dashboard
        </p>
        <Suspense
          fallback={
            <div
              className="w-full max-w-3xl mx-auto h-[min(360px,70vw)] rounded-2xl border border-white/[0.06] bg-white/[0.03] animate-pulse mb-10"
              aria-hidden
            />
          }
        >
          <LazyMotion features={domAnimation}>
            <div className="max-w-3xl mx-auto mb-10">
              <LiveDashboardPreview animateStats={false} />
            </div>
          </LazyMotion>
        </Suspense>
      </RevealOnScroll>

      <RevealOnScroll delay={0.08}>
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
          AI command center
        </p>
        <CommandCenterPreview />
      </RevealOnScroll>
    </Section>
  );
});

export default OwnerDashboardPreview;
