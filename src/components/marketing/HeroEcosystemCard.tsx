import React, { memo } from 'react';
import { Store, ChefHat, ShoppingBag, User, ArrowDown } from 'lucide-react';
import { orderBhojanPublic } from '../../config/demoData';

/**
 * Hero ecosystem card — Restaurant → BhojanOS → OrderBhojan → Customer.
 *
 * Deliberately static (no Framer Motion): the card must render fully and
 * legibly even if JS animation never executes. The only animation is a pure
 * CSS fade-up (`.marketing-hero-enter`) that resolves to opacity:1 — used as
 * progressive enhancement only.
 */

interface EcosystemStep {
  icon: React.ElementType;
  label: string;
  role: string;
  sub: string;
  highlight?: boolean;
}

const STEPS: EcosystemStep[] = [
  { icon: Store, label: 'Restaurant', role: '', sub: 'Your kitchen & business' },
  {
    icon: ChefHat,
    label: 'BhojanOS',
    role: 'The operating platform for food businesses',
    sub: 'Run your menu, orders, kitchen, payments',
    highlight: true,
  },
  {
    icon: ShoppingBag,
    label: 'OrderBhojan',
    role: 'The customer ordering experience',
    sub: 'Customers discover & order',
    highlight: true,
  },
  { icon: User, label: 'Customer', role: '', sub: 'Discover • Order • Enjoy' },
];

const ENTER_DELAYS = ['', 'marketing-hero-enter-delay-1', 'marketing-hero-enter-delay-2', 'marketing-hero-enter-delay-3'];

export const HeroEcosystemCard = memo(function HeroEcosystemCard() {
  return (
    <div className="relative w-full max-w-md mx-auto lg:max-w-none" aria-label="BhojanOS ecosystem overview">
      {/* Soft orange glow behind the card */}
      <div
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[#FF7A00]/[0.07] blur-3xl"
        aria-hidden
      />

      <div className="relative marketing-hero-glass-card rounded-[1.35rem] sm:rounded-[1.75rem] border border-white/[0.08] overflow-hidden shadow-[0_32px_64px_-24px_rgba(0,0,0,0.75)]">
        {/* Card header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/[0.06] bg-[#080808]/90">
          <span className="text-sm font-black text-white tracking-tight">
            Bhojan<span className="text-[#FF7A00]">OS</span>
          </span>
          <span className="text-[10px] font-mono text-neutral-500">Restaurant → Customer</span>
        </div>

        {/* Ecosystem flow */}
        <div className="p-4 sm:p-5 bg-[#0A0A0A]/95">
          {STEPS.map((step, i) => (
            <React.Fragment key={step.label}>
              <div
                className={`marketing-hero-enter ${ENTER_DELAYS[i]} flex items-center gap-3 rounded-xl border p-3 ${
                  step.highlight
                    ? 'border-[#FF7A00]/25 bg-[#FF7A00]/[0.07]'
                    : 'border-white/[0.07] bg-white/[0.02]'
                }`}
              >
                <div
                  className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center border ${
                    step.highlight
                      ? 'bg-[#FF7A00]/15 border-[#FF7A00]/30'
                      : 'bg-white/[0.05] border-white/[0.06]'
                  }`}
                  aria-hidden
                >
                  <step.icon size={18} className={step.highlight ? 'text-[#FF7A00]' : 'text-neutral-300'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white leading-tight">{step.label}</p>
                  {step.role ? (
                    <p className="text-[11px] font-semibold text-[#FF7A00]/90 leading-tight mt-0.5">
                      {step.role}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">{step.sub}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex justify-center py-1" aria-hidden>
                  <ArrowDown size={14} className="text-[#FF7A00]/70" />
                </div>
              )}
            </React.Fragment>
          ))}

          {/* Connection statement */}
          <p className="mt-4 text-center text-[11px] sm:text-xs text-neutral-400 leading-relaxed px-1">
            Orders placed on <span className="text-[#FF7A00] font-semibold">OrderBhojan</span> flow
            directly to the restaurant&rsquo;s <span className="text-white font-semibold">BhojanOS</span>.
          </p>
        </div>

        {/* CTA */}
        <div className="px-4 sm:px-5 py-4 border-t border-white/[0.06] bg-[#080808]/90">
          <a
            href={orderBhojanPublic.homeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#FF7A00] px-4 py-3 text-white text-sm font-bold hover:bg-[#E56D00] transition-colors"
          >
            <ShoppingBag size={16} aria-hidden />
            Order Food on OrderBhojan →
          </a>
        </div>
      </div>
    </div>
  );
});

export default HeroEcosystemCard;