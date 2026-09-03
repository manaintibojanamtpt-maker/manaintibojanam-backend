import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CINEMATIC_ENV_IMAGES } from '../config/marketingFoodImages';

/**
 * Restaurant CTA — cinematic chef/kitchen composition with layered depth.
 * Background kitchen scene graded dark, warm rim light, CTAs wired to real
 * flows: /onboard (restaurant onboarding) + OrderBhojan (ordering).
 */

const IMG = CINEMATIC_ENV_IMAGES;

export function CallToAction() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="cta-heading">
      {/* Background: kitchen scene, graded dark */}
      <div className="cine-photo absolute inset-0" aria-hidden>
        <img
          src={IMG.kitchen.url}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-center"
        />
      </div>

      {/* Depth layering: scrims keep text readable over photography */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/78 to-[#030303]/30"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-[#030303]/60"
      />
      {/* Warm rim light (right side, toward the chef) */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[8%] top-1/2 h-[380px] w-[380px] -translate-y-1/2 rounded-full bg-[#FF7A00]/[0.14] blur-[110px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="max-w-2xl cine-reveal">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#FF7A00]">
            Join BhojanOS
          </p>
          <h2
            id="cta-heading"
            className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl"
          >
            Ready to take control of{' '}
            <span className="text-[#FF7A00]">your food business?</span>
          </h2>
          <p className="mt-5 max-w-lg text-base text-white/60">
            Set up in minutes. Keep every rupee. Own every customer.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/onboard"
              className="group inline-flex items-center gap-2.5 rounded-full bg-[#FF7A00] px-8 py-4 text-sm font-extrabold uppercase tracking-wide text-black transition-all duration-300 hover:shadow-[0_0_36px_rgba(255,122,0,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Start Your Restaurant
              <ArrowRight
                size={17}
                className="transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
            <a
              href="https://www.orderbhojan.com"
              target="_blank"
              rel="noopener noreferrer"
              className="cine-glass inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:border-[#FF7A00]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
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
