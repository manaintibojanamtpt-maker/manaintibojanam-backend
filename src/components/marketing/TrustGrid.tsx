import React, { memo } from 'react';
import { CheckCircle2, ShieldCheck, Clock, TrendingUp, Users, Store, ChefHat, Zap } from 'lucide-react';
import { BhojanOSPartnershipMarquee } from './BhojanOSPartnershipMarquee';

const TRUST_INDICATORS = [
  { icon: CheckCircle2, label: '0% Commission', color: '#10B981' },
  { icon: ShieldCheck, label: '100% Data Sovereignty', color: '#3B82F6' },
  { icon: Clock, label: 'Instant T+0 UPI Settlement', color: '#D97706' },
  { icon: TrendingUp, label: 'Direct Kitchen Margins', color: '#10B981' },
  { icon: Users, label: 'Direct Guest CRM', color: '#A855F7' },
  { icon: Store, label: 'Branded Web Storefront', color: '#D97706' },
  { icon: ChefHat, label: 'Station-Based KDS', color: '#F59E0B' },
  { icon: Zap, label: 'Auto 3PL Dispatch', color: '#3B82F6' },
] as const;

export const TrustGrid = memo(function TrustGrid() {
  return (
    <section className="py-14 sm:py-16 bg-[#09090B] border-b border-[#27272A] text-[#FAFAFA] overflow-hidden" aria-label="Trust indicators and partners">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        {/* Section label */}
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#A1A1AA] mb-8 font-mono">
          The Sovereign Technology Stack For Indian Food Businesses
        </p>

        {/* Trust indicator grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TRUST_INDICATORS.map(({ icon: Icon, label, color }, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 py-4 px-3 rounded-lg border border-[#27272A] bg-[#18181B] hover:border-[#D97706]/40 transition-colors duration-150 shadow-none"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-md"
                style={{ color, background: `${color}18`, border: `1px solid ${color}35` }}
              >
                <Icon size={16} aria-hidden="true" />
              </div>
              <span className="text-xs font-medium text-[#E4E4E7] text-center leading-tight">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Official Rail & Dispatch Integrations Marquee */}
      <div className="w-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="flex items-center gap-4" aria-hidden="true">
            <div className="flex-1 h-px bg-[#27272A]" />
            <span className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-[#A1A1AA]">
              Official Rails, Payments &amp; Delivery Dispatch Integrations
            </span>
            <div className="flex-1 h-px bg-[#27272A]" />
          </div>
        </div>

        <BhojanOSPartnershipMarquee speed={32} pauseOnHover={true} />
      </div>
    </section>
  );
});

export default TrustGrid;
