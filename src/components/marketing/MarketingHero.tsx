import React, { useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Flame, Bike, CheckCircle2 } from 'lucide-react';
import { CINEMATIC_ENV_IMAGES } from '../../config/marketingFoodImages';

/**
 * Cinematic hero V2 — Scene 1.
 * Visual-first: kitchen photo + floating order cards + 3D phone.
 * Mouse parallax creates depth hierarchy (reduced-motion safe).
 * Copy reduced to short headline + 1 line + CTAs.
 */

const IMG = CINEMATIC_ENV_IMAGES;

/* Mouse parallax: shifts layers at different rates based on cursor position. */
function useMouseParallax() {
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const cx = (e.clientX / window.innerWidth - 0.5) * 2;
    const cy = (e.clientY / window.innerHeight - 0.5) * 2;
    const entries: [string, number][] = [
      ['hero-bg', 0.15],
      ['hero-photo', 0.35],
      ['hero-dashboard', 0.6],
      ['hero-phone', 0.85],
      ['hero-notify', 1.1],
    ];
    entries.forEach(([key, mult]) => {
      const el = refs.current[key];
      if (el) {
        el.style.setProperty('--parallax-x', `${cx * 14 * mult}px`);
        el.style.setProperty('--parallax-y', `${cy * 10 * mult}px`);
      }
    });
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  const setRef = (key: string) => (el: HTMLElement | null) => {
    refs.current[key] = el;
  };

  return { setRef };
}

function OrderCard({
  icon,
  status,
  tone,
  className,
}: {
  icon: React.ReactNode;
  status: string;
  tone: 'accent' | 'green' | 'plain';
  className: string;
}) {
  const tones = {
    accent: 'text-[#FF7A00] bg-[#FF7A00]/12',
    green: 'text-[#34D399] bg-[#34D399]/12',
    plain: 'text-white/60 bg-white/[0.07]',
  } as const;
  return (
    <div className={`cine-glass cine-float rounded-2xl px-4 py-3 ${className}`}>
      <div className="flex items-center gap-2.5">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tones[tone]}`}>
          {icon}
        </span>
        <span className="text-xs font-bold text-white/90">{status}</span>
      </div>
    </div>
  );
}

function NewOrderCard() {
  return (
    <div className="cine-glass cine-glass-accent cine-float-soft cine-status-live w-[190px] rounded-2xl p-4">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-white">
        <Bell size={12} className="text-[#FF7A00]" aria-hidden />
        New Order #1042
      </div>
      <p className="text-[11px] text-white/65">Chicken Biryani ×2</p>
      <p className="mt-0.5 font-display text-lg font-extrabold text-white">₹498</p>
      <span className="mt-2 inline-block rounded-full bg-[#FF7A00]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#FF7A00]">
        Preparing
      </span>
    </div>
  );
}

function HeroPhone() {
  return (
    <div className="cine-float [perspective:1200px]" style={{ animationDuration: '7s' }}>
      <div className="cine-glass cine-glass-accent cine-phone-hover w-[130px] -rotate-[8deg] rounded-[24px] p-1.5 shadow-[0_40px_80px_-24px_rgba(0,0,0,0.85)] [transform:rotateX(6deg)]">
        <div className="rounded-[18px] bg-[#0A0A0A] p-2">
          <div className="mb-1.5 text-center text-[9px] font-bold tracking-wide text-white">OrderBhojan</div>
          <img src={IMG.foodTable.url} alt="" aria-hidden loading="lazy" decoding="async" className="cine-food-img mb-1.5 h-28 w-full rounded-xl object-cover" />
          <div className="mb-1.5 text-center text-[9px] font-semibold text-white/80">Chicken Biryani</div>
          <div className="mb-1.5 text-center text-[10px] font-extrabold text-white">₹249</div>
          <div className="flex h-6 items-center justify-center rounded-lg bg-[#FF7A00] text-[9px] font-bold text-black">Order Direct</div>
        </div>
      </div>
    </div>
  );
}

export function MarketingHero() {
  const { setRef } = useMouseParallax();

  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-heading">
      <div
        aria-hidden
        className="cine-parallax cine-parallax-deep pointer-events-none absolute -top-32 right-0 h-[560px] w-[560px] rounded-full bg-[#FF7A00]/[0.07] blur-[130px]"
        ref={setRef('hero-bg')}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:pb-28 lg:pt-20">
        {/* LEFT — copy (reduced) */}
        <div className="cine-reveal">
          <span className="cine-glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
            <Flame size={12} className="text-[#FF7A00]" aria-hidden />
            The Food Business Platform
          </span>

          <h1
            id="hero-heading"
            className="font-display mt-6 text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl"
          >
            Your kitchen.{' '}
            <span className="text-[#FF7A00]">Your customers.</span>
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-white/55">
            Orders, kitchen, payments, delivery — one OS. Zero commission, always.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              to="/onboard"
              className="group inline-flex items-center gap-2.5 rounded-full bg-[#FF7A00] px-8 py-4 text-sm font-extrabold uppercase tracking-wide text-black transition-all duration-300 hover:shadow-[0_0_36px_rgba(255,122,0,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Start Your Restaurant
              <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
            <a
              href="https://www.orderbhojan.com"
              target="_blank"
              rel="noopener noreferrer"
              className="cine-glass inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:border-[#FF7A00]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
            >
              Explore OrderBhojan
            </a>
          </div>
        </div>

        {/* RIGHT — cinematic composition with parallax */}
        <div className="relative" aria-hidden={false}>
          <div
            className="cine-parallax cine-parallax-mid"
            ref={setRef('hero-photo')}
          >
            <div className="cine-photo cine-hero-zoom relative h-[440px] overflow-hidden rounded-3xl sm:h-[520px]">
              <img
                src={IMG.kitchen.url}
                alt="Professional chef cooking in a warm, active restaurant kitchen"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </div>

          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path d="M18 22 C 40 10, 60 30, 78 20" stroke="rgba(255,122,0,0.5)" strokeWidth="0.5" fill="none" className="cine-dash-path" vectorEffect="non-scaling-stroke" />
            <path d="M20 78 C 45 88, 60 60, 82 72" stroke="rgba(255,122,0,0.35)" strokeWidth="0.5" fill="none" className="cine-dash-path" vectorEffect="non-scaling-stroke" />
          </svg>

          <div className="cine-parallax cine-parallax-front absolute left-4 top-6 sm:left-8" ref={setRef('hero-notify')}>
            <NewOrderCard />
          </div>
          <div className="cine-parallax cine-parallax-front absolute right-3 top-1/3 sm:right-6" ref={setRef('hero-dashboard')}>
            <OrderCard icon={<CheckCircle2 size={13} />} status="Ready for Pickup" tone="green" className="cine-float-delay-1" />
          </div>
          <div className="cine-parallax cine-parallax-front absolute bottom-16 right-4 sm:right-10" ref={setRef('hero-phone')}>
            <OrderCard icon={<Bike size={13} />} status="Out for Delivery" tone="accent" className="cine-float-delay-2" />
          </div>
          <div className="cine-parallax cine-parallax-front absolute bottom-6 left-6 sm:left-12" ref={setRef('hero-phone')}>
            <HeroPhone />
          </div>
        </div>
      </div>
    </section>
  );
}

export default MarketingHero;

