import React, { memo, lazy, Suspense, useCallback } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import { ArrowRight, Star, Check } from 'lucide-react';
import { MarketingSoftCTA } from './MarketingSoftCTA';
import { MarketingSoftPill } from './MarketingSoftPill';
import { landingHero } from '../../config/landing';
import { onboardingPlanMessaging } from '../../config/pricing';

const LiveDashboardPreview = lazy(() =>
  import('./LiveDashboardPreview').then((m) => ({ default: m.LiveDashboardPreview }))
);

export const MarketingHero = memo(function MarketingHero() {
  const scrollToDemo = useCallback(() => {
    document.getElementById(landingHero.demoTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <section className="marketing-hero-offset relative overflow-hidden pb-10 sm:pb-16 lg:pb-20">
      <div className="pointer-events-none absolute inset-0 marketing-hero-grid-bg opacity-50" aria-hidden />
      <div
        className="pointer-events-none absolute -top-24 left-1/4 w-[min(100%,560px)] h-[360px] rounded-full bg-[#FF7A00]/[0.08] blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
        aria-hidden
      />

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-8 lg:gap-12 xl:gap-14 items-center">
          <div className="text-center lg:text-left order-1">
            <div className="marketing-hero-enter mb-4 flex justify-center lg:justify-start">
              <MarketingSoftPill variant="eyebrow">
                <span className="marketing-soft-pill-eyebrow-text">{landingHero.category}</span>
              </MarketingSoftPill>
            </div>

            <h1 className="mb-4 sm:mb-5 marketing-hero-enter marketing-hero-enter-delay-1">
              {landingHero.headlineLines.map((line) => (
                <span
                  key={line}
                  className={`block text-[1.625rem] sm:text-4xl md:text-[2.5rem] lg:text-[2.85rem] font-black tracking-[-0.03em] leading-[1.08] ${
                    line === '0% Commission.' ? 'marketing-hero-accent-text' : 'text-white'
                  }`}
                >
                  {line}
                </span>
              ))}
            </h1>

            <p className="marketing-hero-enter marketing-hero-enter-delay-2 text-[15px] sm:text-lg font-semibold text-white/90 mb-2 max-w-xl mx-auto lg:mx-0">
              {landingHero.subhead}
            </p>

            <p className="text-sm sm:text-[15px] text-neutral-400 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-7">
              {landingHero.description}
            </p>

            <div
              className="marketing-hero-enter marketing-hero-enter-delay-2 marketing-hero-badge-row justify-center lg:justify-start mb-6 sm:mb-7"
              role="list"
              aria-label="Key benefits"
            >
              {landingHero.badges.map((badge) => (
                <MarketingSoftPill key={badge} variant="badge" role="listitem">
                  <Check size={11} className="text-[#FF7A00] shrink-0" strokeWidth={2.5} />
                  {badge}
                </MarketingSoftPill>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 mb-2">
              <MarketingSoftCTA to="/owner/register" className="marketing-soft-cta--block w-full sm:w-auto sm:min-w-[220px]">
                {landingHero.primaryCta}
                <ArrowRight size={17} strokeWidth={2.5} />
              </MarketingSoftCTA>
              <MarketingSoftCTA
                tone="ghost"
                onClick={scrollToDemo}
                className="marketing-soft-cta--block w-full sm:w-auto sm:min-w-[180px]"
              >
                {landingHero.secondaryCta}
              </MarketingSoftCTA>
            </div>

            <p className="text-xs sm:text-sm text-neutral-500 max-w-xl mx-auto lg:mx-0 mb-6">
              {onboardingPlanMessaging.heroPlanNote}
            </p>

            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-2 sm:gap-4 text-sm w-full pt-1 border-t border-white/[0.06]">
              <div className="flex items-center gap-0.5 pt-3 sm:pt-0" aria-label={`${landingHero.trustStars} star rating`}>
                {Array.from({ length: landingHero.trustStars }).map((_, i) => (
                  <Star key={i} size={14} className="fill-[#FF7A00] text-[#FF7A00]" />
                ))}
              </div>
              <div className="text-center lg:text-left pb-1 sm:pb-0">
                <p className="font-semibold text-neutral-300 text-sm">{landingHero.trustLabel}</p>
                <p className="text-neutral-500 text-xs">{landingHero.trustSub}</p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md mx-auto lg:max-w-none order-2 lg:order-2 marketing-hero-demo-frame">
            <Suspense
              fallback={
                <div
                  className="w-full h-[min(340px,68vw)] rounded-2xl border border-white/[0.06] bg-white/[0.03] animate-pulse"
                  aria-hidden
                />
              }
            >
              <LazyMotion features={domAnimation}>
                <LiveDashboardPreview compact />
              </LazyMotion>
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
});

export default MarketingHero;
