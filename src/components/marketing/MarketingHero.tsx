import React, { memo, lazy, Suspense } from 'react';
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
  return (
    <section className="marketing-hero-offset relative overflow-hidden pb-16 sm:pb-20 lg:pb-24">
      <div className="pointer-events-none absolute inset-0 marketing-hero-grid-bg opacity-60" aria-hidden />
      <div
        className="pointer-events-none absolute -top-32 left-1/4 w-[min(100%,700px)] h-[480px] rounded-full bg-[#FF7A00]/[0.1] blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/3 -right-24 w-[360px] h-[360px] rounded-full bg-violet-600/[0.05] blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
        aria-hidden
      />

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-14 xl:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className="marketing-hero-enter mb-5 flex justify-center lg:justify-start">
              <div className="marketing-hero-eyebrow-loop">
                <span className="marketing-hero-eyebrow-loop-inner">
                  <span className="marketing-hero-eyebrow-loop-text">
                    {landingHero.category}
                  </span>
                </span>
              </div>
            </div>

            <div
              className="marketing-hero-enter marketing-hero-enter-delay-1 marketing-hero-badge-row justify-center lg:justify-start mb-6 sm:mb-8"
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

            <h1 className="mb-6 sm:mb-7 marketing-hero-enter marketing-hero-enter-delay-2">
              {landingHero.headlineLines.map((line) => (
                <span
                  key={line}
                  className={`block text-[1.75rem] sm:text-4xl md:text-[2.65rem] lg:text-[3rem] font-black tracking-[-0.03em] leading-[1.1] ${
                    line === '0% Commission.' ? 'marketing-hero-accent-text' : 'text-white'
                  }`}
                >
                  {line}
                </span>
              ))}
            </h1>

            <p className="marketing-hero-enter marketing-hero-enter-delay-3 text-base sm:text-lg font-semibold text-white/90 mb-3 max-w-xl mx-auto lg:mx-0">
              {landingHero.subhead}
            </p>

            <p className="text-[15px] sm:text-base text-neutral-400 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8 sm:mb-9">
              {landingHero.description}
            </p>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 mb-3">
              <MarketingSoftCTA to="/owner/register" className="marketing-soft-cta--block w-full sm:w-auto">
                {landingHero.primaryCta}
                <ArrowRight size={17} strokeWidth={2.5} />
              </MarketingSoftCTA>
            </div>

            <p className="marketing-hero-enter marketing-hero-enter-delay-3 text-xs sm:text-sm text-neutral-500 max-w-xl mx-auto lg:mx-0 mb-7">
              {onboardingPlanMessaging.heroPlanNote}
            </p>

            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3 sm:gap-5 text-sm w-full">
              <div className="flex items-center gap-0.5" aria-label={`${landingHero.trustStars} star rating`}>
                {Array.from({ length: landingHero.trustStars }).map((_, i) => (
                  <Star key={i} size={14} className="fill-[#FF7A00] text-[#FF7A00]" />
                ))}
              </div>
              <div className="text-center lg:text-left">
                <p className="font-semibold text-neutral-300">{landingHero.trustLabel}</p>
                <p className="text-neutral-500 text-xs sm:text-sm">{landingHero.trustSub}</p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-lg mx-auto lg:max-w-none marketing-hero-demo-frame">
            <Suspense
              fallback={
                <div
                  className="w-full h-[min(420px,72vw)] rounded-2xl border border-white/[0.06] bg-white/[0.03] animate-pulse"
                  aria-hidden
                />
              }
            >
              <LazyMotion features={domAnimation}>
                <LiveDashboardPreview />
              </LazyMotion>
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
});

export default MarketingHero;
