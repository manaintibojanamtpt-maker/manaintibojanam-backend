import React, { memo } from 'react';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { CommandCenterPreview } from './CommandCenterPreview';
import { RevealOnScroll } from './RevealOnScroll';
import { useCountUp } from '../../hooks/useCountUp';

const StatPill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-center min-w-0">
    <div className="text-lg sm:text-xl font-black text-white tabular-nums truncate">{value}</div>
    <div className="text-[10px] sm:text-xs text-neutral-500 uppercase tracking-wider mt-0.5">{label}</div>
  </div>
);

export const OwnerDashboardPreview = memo(function OwnerDashboardPreview() {
  const sales = useCountUp(18420, 2000, true);
  const orders = useCountUp(67, 1600, true);
  const repeat = useCountUp(34, 1400, true);

  return (
    <Section id="dashboard-preview" background="subtle" className="scroll-mt-24">
      <SectionHeader
        label="Owner Dashboard"
        title="Production-Grade SaaS for Restaurant Operators"
        description="Revenue, orders, kitchen queue, inventory, and customer growth — one dashboard your team actually uses."
      />

      <RevealOnScroll className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
        <StatPill label="Today's Sales" value={`₹${sales.toLocaleString('en-IN')}`} />
        <StatPill label="Live Orders" value={String(orders)} />
        <StatPill label="Kitchen Queue" value="8 prep" />
        <StatPill label="Top Item" value="Biryani" />
        <StatPill label="Repeat Customers" value={`${repeat}%`} />
        <StatPill label="Inventory" value="2 alerts" />
      </RevealOnScroll>

      <RevealOnScroll delay={0.1}>
        <CommandCenterPreview />
      </RevealOnScroll>
    </Section>
  );
});

export default OwnerDashboardPreview;
