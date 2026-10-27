import { ArrowRight, Flame } from 'lucide-react';

/**
 * Restaurant CTA — dark premium gradient background with accent glow.
 * CTAs wired to real flows: /onboard (restaurant onboarding) + OrderBhojan (ordering).
 */

export function CallToAction() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="cta-heading">
      {/* Dark gradient background — no photograph */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0500] via-[#0D0800] to-[#070504]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
        aria-hidden
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/50 to-[#030303]/10"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-[#030303]/30"
      />
      {/* Warm rim light */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[10%] top-1/2 h-[320px] w-[320px] -translate-y-1/2 rounded-full bg-[#D9852F]/[0.08] blur-[100px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="max-w-2xl">
          <div className="marketing-hero-eyebrow-loop inline-flex items-center mb-6">
            <span className="marketing-hero-eyebrow-loop-inner">
              <span className="marketing-hero-eyebrow-loop-text">
                <Flame size={11} className="text-[#D9852F] mr-1.5" aria-hidden />
                Join BhojanOS
              </span>
            </span>
          </div>
          <h2
            id="cta-heading"
            className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl"
          >
            Your kitchen deserves a premium brand.
          </h2>
          <p className="mt-5 max-w-lg text-base text-white/60">
            Set up in minutes. Keep every rupee. Own every customer.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            {/* Cross-shell navigation: /owner/register lives in the app shell (full page load required — MarketingApp has no owner routes). */}
            <a
              href="/owner/register"
              className="btn-premium-primary"
            >
              Get Free POS
              <ArrowRight
                size={17}
                className="transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden
              />
            </a>
            <a
              href="https://orderbhojan.web.app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-premium-secondary"
            >
              Order Food
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CallToAction;
