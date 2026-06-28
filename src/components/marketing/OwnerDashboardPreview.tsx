import React, { memo } from 'react';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { CommandCenterPreview } from './CommandCenterPreview';
import { RevealOnScroll } from './RevealOnScroll';

export const OwnerDashboardPreview = memo(function OwnerDashboardPreview() {
  return (
    <Section id="dashboard-preview" background="subtle" className="scroll-mt-24">
      <SectionHeader
        label="Product preview"
        title="Production-Grade SaaS for Restaurant Operators"
        description="Revenue, kitchen queue, demand forecasts, and customer intelligence — one command center your team actually uses."
      />

      <RevealOnScroll>
        <CommandCenterPreview />
      </RevealOnScroll>
    </Section>
  );
});

export default OwnerDashboardPreview;
