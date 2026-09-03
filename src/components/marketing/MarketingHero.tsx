import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Flame, Bike, CheckCircle2 } from 'lucide-react';
import { CINEMATIC_ENV_IMAGES } from '../../config/marketingFoodImages';

/**
 * Cinematic hero — Scene 1.
 * Left: badge, oversized headline with orange emphasis, dual CTA, 3 benefits.
 * Right: cinematic kitchen photo + floating order-status cards + 3D phone,
 * connected with glowing dashed paths. Static JSX + CSS-only motion
 * (progressive enhancement — fully visible without JS animation).
 */

const IMG = CINEMATIC_ENV_IMAGES;

const BENEFITS = [
  { title: '0% Commission', sub: 'On every direct order' },
  { title: 'Own Your Customers', sub: 'Names, numbers, loyalty' },
  { title: 'All In One', sub: 'Orders, kitchen, menu, payments' },
];

/* Floating order-status card (glass, layered above photo). */
function OrderCard({
  icon,
  status,
  tone,
  className,
  delayClass,
}: {
  icon: React.ReactNode;
  status: string;
  tone: 'accent' | 'green' | 'plain';
  className: string;
  delayClass?: string;
}) {
  const tones = {
    accent: 'text-[#FF7A00] bg-[#FF7A00]/12',
    green: 'text-[#34D399] bg-[#34D399]/12',
    plain: 'text-white/60 bg-white/[0.07]',
  } as const;
  return (
    <div className={`cine-glass cine-float rounded-2xl px-4 py-3 ${delayClass ?? ''} ${className}`}>
      <div className="flex items-center gap-2.5">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tones[tone]}`}>
          {icon}
        </span>
        <span className="text-xs font-bold text-white/90">{status}</span>
      </div>
    </div>
  );
}

/* New order ticket — the hero's anchor UI card. */
function NewOrderCard() {
  return (
    <div className="cine-glass cine-glass-accent cine-float-soft w-[190px] rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-white">
          <Bell size={12} className="text-[#FF7A00]" aria-hidden />
          New Order #1042
        </span>
      </div>
      <p className="text-[11px] text-white/65">Chicken Biryani ×2</p>
      <p className="mt-0.5 font-display text-lg font-extrabold text-white">₹498</p>
      <span className="mt-2 inline-block rounded-full bg-[#FF7A00]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#FF7A00]">
        Preparing
      </span>
    </div>
  );
}

/* 3D-perspective phone showing OrderBhojan. */
function HeroPhone() {
  return (
    <div
      className="cine-float [perspective:1200px]"
      style={{ animationDuration: '7s' }}
    >
      <div className="cine-glass cine-glass-accent w-[130px] -rotate-[8deg] rounded-[24px] p-1.5 shadow-[0_40px_80px_-24px_rgba(0,0,0,0.85)] [transform:rotateX(6deg)]">
        <div className="rounded-[18px] bg-[#0A0A0A] p-2">
          <div className="mb-1.5 text-center text-[9px] font-bold tracking-wide text-white">
            OrderBhojan
          </div>
          <img
            src={IMG.foodTable.url}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="cine-food-img mb-1.5 h-28 w-full rounded-xl object-cover"
          />
          <div className="mb-1.5 text-center text-[9px] font-semibold text-white/80">
            Chicken Biryani
          </div>
          <div className="mb-1.5 text-center text-[10px] font-extrabold text-white">₹249</div>
          <div className="flex h-6 items-center justify-center rounded-lg bg-[#FF7A00] text-[9px] font-bold text-black">
            Order Direct
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketingHero() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-heading">
      {/* Ambient warm glow behind composition */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 h-[560px] w-[560px] rounded-full bg-[#FF7A00]/[0.07] blur-[130px]"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:pb-28 lg:pt-20">
        {/* LEFT — copy */}
        <div>
          <span className="cine-glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
            <Flame size={12} className="text-[#FF7A00]" aria-hidden />
            The Food Business Platform
          </span>

          <h1
            id="hero-heading"
            className="font-display mt-6 text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl"
          >
            Run your food business.{' '}
            <span className="text-[#FF7A00]">Own your customers.</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-white/55">
            BhojanOS gives restaurants everything they need to manage orders,
            kitchen, menu, inventory, payments and customers. OrderBhojan brings
            customers directly to your business.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
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

          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            {BENEFITS.map((b) => (
              <div key={b.title}>
                <dt className="text-sm font-extrabold text-white">{b.title}</dt>
                <dd className="mt-0.5 text-[11px] text-white/40">{b.sub}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* RIGHT — cinematic composition */}
        <div className="relative" aria-hidden={false}>
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

          {/* Glowing connector path behind cards */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M18 22 C 40 10, 60 30, 78 20"
              stroke="rgba(255,122,0,0.5)"
              strokeWidth="0.5"
              fill="none"
              className="cine-dash-path"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M20 78 C 45 88, 60 60, 82 72"
              stroke="rgba(255,122,0,0.35)"
              strokeWidth="0.5"
              fill="none"
              className="cine-dash-path"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Floating UI layer */}
          <div className="absolute left-4 top-6 sm:left-8">
            <NewOrderCard />
          </div>
          <div className="absolute right-3 top-1/3 sm:right-6">
            <OrderCard
              icon={<CheckCircle2 size={13} />}
              status="Ready for Pickup"
              tone="green"
              className="cine-float-delay-1"
            />
          </div>
          <div className="absolute bottom-16 right-4 sm:right-10">
            <OrderCard
              icon={<Bike size={13} />}
              status="Out for Delivery"
              tone="accent"
              className="cine-float-delay-2"
            />
          </div>
          <div className="absolute bottom-6 left-6 sm:left-12">
            <HeroPhone />
          </div>
        </div>
      </div>
    </section>
  );
}

export default MarketingHero;

