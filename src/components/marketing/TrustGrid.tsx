import React, { memo } from 'react';
import { CheckCircle2, ShieldCheck, Clock, TrendingUp, Users, Store, ChefHat, Zap } from 'lucide-react';

const TRUST_INDICATORS = [
  { icon: CheckCircle2, label: 'Zero Commission', color: '#34D399' },
  { icon: ShieldCheck, label: 'Data Ownership', color: '#60A5FA' },
  { icon: Clock, label: 'Instant Settlement', color: '#D9852F' },
  { icon: TrendingUp, label: 'AI Insights', color: '#A78BFA' },
  { icon: Users, label: '50K+ Customers', color: '#F472B6' },
  { icon: Store, label: '3.5K+ Restaurants', color: '#34D399' },
  { icon: ChefHat, label: 'Free POS', color: '#D9852F' },
  { icon: Zap, label: 'Zero Setup Fee', color: '#60A5FA' },
] as const;

const PARTNER_LOGOS = [
  { name: 'Razorpay', letter: 'R', color: '#6B7280' },
  { name: 'Rapido', letter: 'Ra', color: '#FF5F1F' },
  { name: 'Porter', letter: 'Po', color: '#1E88E5' },
  { name: 'Uber Direct', letter: 'U', color: '#000000' },
  { name: 'UrbanPiper', letter: 'UP', color: '#7C3AED' },
  { name: 'RanceLab', letter: 'RL', color: '#059669' },
] as const;

export const TrustGrid = memo(function TrustGrid() {
  return (
    <section className="py-16 sm:py-20" aria-label="Trust indicators and partners">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section label */}
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-10">
          Trusted by independent food businesses
        </p>

        {/* Trust indicator grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          {TRUST_INDICATORS.map(({ icon: Icon, label, color }, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 py-5 px-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] transition-colors duration-200"
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
              >
                <Icon size={16} aria-hidden />
              </div>
              <span className="text-[11px] font-medium text-white/60 text-center leading-tight">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-8" aria-hidden>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20">
            Integrated with
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        </div>

        {/* Partner logo grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {PARTNER_LOGOS.map(({ name, letter, color }, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 py-5 px-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors duration-200"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
                style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}
              >
                {letter}
              </div>
              <span className="text-[10px] font-medium text-white/40 text-center leading-tight">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

export default TrustGrid;
