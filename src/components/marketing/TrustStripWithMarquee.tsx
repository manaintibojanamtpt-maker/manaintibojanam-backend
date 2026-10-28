import React, { memo, useRef, useCallback } from 'react';
import { Store, ChefHat, Package, Truck, CreditCard, Users, Megaphone, Sparkles, Bike, Truck as TruckIcon, Zap, CheckCircle2, ShieldCheck, Clock, TrendingUp } from 'lucide-react';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { RevealOnScroll } from './RevealOnScroll';
import { LazyMotion, domAnimation, m } from 'framer-motion';

/** ── Trust indicators for marquee ── */
const TRUST_ITEMS = [
  { icon: CheckCircle2, label: 'Zero Commission', color: '#34D399' },
  { icon: ShieldCheck, label: 'Data Ownership', color: '#60A5FA' },
  { icon: Clock, label: 'Instant Settlement', color: '#D9852F' },
  { icon: TrendingUp, label: 'AI Insights', color: '#A78BFA' },
  { icon: Users, label: '50K+ Customers', color: '#F472B6' },
  { icon: Store, label: '3.5K+ Restaurants', color: '#34D399' },
  { icon: ChefHat, label: 'Free POS', color: '#D9852F' },
  { icon: Zap, label: 'Zero Setup Fee', color: '#60A5FA' },
] as const;

/** ── 3PL Partner logos for marquee ── */
const PARTNER_ITEMS = [
  { name: 'Rapido', color: '#FACC15', bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.35)' },
  { name: 'Porter', color: '#38BDF8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.35)' },
  { name: 'Uber Direct', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)' },
  { name: 'In-House', color: '#34D399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.35)' },
  { name: 'Zepto', color: '#F472B6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.35)' },
  { name: 'Swiggy Genie', color: '#F97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)' },
] as const;

/** ── Mouse-tracking spotlight hook ── */
function useSpotlight(ref: React.RefObject<HTMLDivElement>) {
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--spotlight-x', `${x}%`);
    el.style.setProperty('--spotlight-y', `${y}%`);
  }, [ref]);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (el) {
      el.style.setProperty('--spotlight-x', '50%');
      el.style.setProperty('--spotlight-y', '50%');
    }
  }, []);

  return { handleMouseMove, handleMouseLeave };
}

/** ── Spotlight card wrapper ── */
function SpotlightCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { handleMouseMove, handleMouseLeave } = useSpotlight(ref);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`card-spotlight card-spring-hover card-specular-top relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 ${className}`}
    >
      {children}
    </div>
  );
}

/** ── Trust Strip with infinite scroll marquee ── */
function TrustStripMarquee() {
  return (
    <div className="relative overflow-hidden py-8">
      {/* Gradient fade masks */}
      <div className="marquee-mask-left absolute inset-y-0 left-0 z-10" aria-hidden />
      <div className="marquee-mask-right absolute inset-y-0 right-0 z-10" aria-hidden />

      <div className="marquee-scroll">
        {/* Duplicate items for seamless loop */}
        {[...TRUST_ITEMS, ...TRUST_ITEMS].map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="trust-strip__item mx-8">
              <div
                className="trust-strip__icon"
                style={{ color: item.color, borderColor: item.color + '40', background: item.color + '15' }}
              >
                <Icon size={18} aria-hidden />
              </div>
              <span className="trust-strip__label" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** ── Partner logo marquee ── */
function PartnerMarquee() {
  return (
    <div className="relative overflow-hidden py-6">
      <div className="marquee-mask-left absolute inset-y-0 left-0 z-10" aria-hidden />
      <div className="marquee-mask-right absolute inset-y-0 right-0 z-10" aria-hidden />

      <div className="marquee-scroll">
        {[...PARTNER_ITEMS, ...PARTNER_ITEMS].map((partner, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border mx-4"
            style={{
              borderColor: partner.border,
              background: partner.bg,
            }}
          >
            <Bike size={16} style={{ color: partner.color }} aria-hidden />
            <span className="text-sm font-semibold" style={{ color: partner.color }}>
              {partner.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const TrustStripWithMarquee = memo(function TrustStripWithMarquee() {
  return (
    <LazyMotion features={domAnimation}>
      <Section background="subtle" className="py-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-6">
              Trusted by independent food businesses
            </p>
          </RevealOnScroll>

          {/* Trust indicators marquee */}
          <RevealOnScroll delay={0.1}>
            <TrustStripMarquee />
          </RevealOnScroll>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8" aria-hidden>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Delivery Partners
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Partner logos marquee */}
          <RevealOnScroll delay={0.2}>
            <PartnerMarquee />
          </RevealOnScroll>
        </div>
      </Section>
    </LazyMotion>
  );
});

export default TrustStripWithMarquee;
