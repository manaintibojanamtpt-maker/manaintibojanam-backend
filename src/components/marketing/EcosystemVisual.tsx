import React from 'react';
import { Store, Smartphone, User, ChefHat } from 'lucide-react';
import { CINEMATIC_ENV_IMAGES } from '../../config/marketingFoodImages';

/**
 * Connected Food Ecosystem — visual system replacing the text explanation.
 * RESTAURANT → BHOJANOS → ORDERBHOJAN → CUSTOMER
 * Static JSX + CSS-only animation (progressive enhancement, reduced-motion safe).
 */

const IMG = CINEMATIC_ENV_IMAGES;

/* Animated connector — horizontal on desktop, vertical on mobile. */
function Connector({ label }: { label: string }) {
  return (
    <div
      className="relative flex items-center justify-center max-md:py-6"
      aria-hidden
    >
      <span className="absolute max-md:rotate-90 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FF7A00]/70">
        {label}
      </span>
      <svg
        width="120"
        height="24"
        viewBox="0 0 120 24"
        fill="none"
        className="max-md:h-6 max-md:w-[120px] max-md:rotate-90"
      >
        <path
          d="M2 12 H104"
          stroke="rgba(255,122,0,0.45)"
          strokeWidth="1.5"
          className="cine-dash-path"
        />
        <path d="M104 6 L116 12 L104 18 Z" fill="rgba(255,122,0,0.75)" />
        <circle cx="12" cy="12" r="3" fill="#FF7A00" className="cine-node" />
      </svg>
    </div>
  );
}

function StageLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FF7A00]/12 text-[#FF7A00]">
        {icon}
      </span>
      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
        {title}
      </span>
    </div>
  );
}

/* Mini BhojanOS dashboard mockup (pure JSX). */
function DashboardMockup() {
  return (
    <div className="cine-glass flex h-full min-h-[240px] flex-col rounded-2xl p-3.5">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-[#FF7A00]/60" />
        <span className="ml-2 text-[10px] font-semibold tracking-wide text-white/50">
          BhojanOS · Command Center
        </span>
      </div>
      <div className="mb-2 grid grid-cols-3 gap-1.5">
        {[
          ['Orders', '48'],
          ['Sales', '₹18,450'],
          ['New', '25'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-white/[0.04] px-2 py-1.5">
            <div className="text-[9px] uppercase tracking-wider text-white/40">{k}</div>
            <div className="text-[13px] font-bold text-white">{v}</div>
          </div>
        ))}
      </div>
      <div className="mb-2 flex gap-1.5">
        {[
          ['Incoming', 'bg-white/[0.06] text-white/60'],
          ['Preparing', 'bg-[#FF7A00]/15 text-[#FF7A00]'],
          ['Ready', 'bg-[#34D399]/15 text-[#34D399]'],
        ].map(([s, c]) => (
          <span key={s} className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${c}`}>
            {s}
          </span>
        ))}
      </div>
      {[
        ['#1042', 'Chicken Biryani ×2', '₹498', 'Preparing'],
        ['#1041', 'Masala Dosa ×1', '₹129', 'Ready'],
      ].map(([id, item, amt, st]) => (
        <div
          key={id}
          className="mb-1.5 flex items-center justify-between rounded-lg bg-white/[0.04] px-2.5 py-2"
        >
          <div>
            <div className="text-[10px] font-semibold text-white/85">{item}</div>
            <div className="text-[9px] text-white/40">{id} · Table 4</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold text-white">{amt}</div>
            <div
              className={`text-[9px] font-semibold ${
                st === 'Preparing' ? 'text-[#FF7A00]' : 'text-[#34D399]'
              }`}
            >
              {st}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* Mini OrderBhojan mobile-ordering mockup (pure JSX). */
function PhoneMockup() {
  return (
    <div className="cine-glass cine-glass-accent cine-float-soft relative mx-auto w-full max-w-[170px] rounded-[22px] p-2">
      <div className="rounded-[16px] bg-[#0A0A0A] p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold text-white">OrderBhojan</span>
          <span className="rounded-full bg-[#FF7A00]/15 px-1.5 py-0.5 text-[8px] font-bold text-[#FF7A00]">
            0% fee
          </span>
        </div>
        <div className="mb-2 overflow-hidden rounded-lg">
          <img
            src={IMG.foodTable.url}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="cine-food-img h-20 w-full object-cover"
          />
        </div>
        <div className="mb-1.5 flex items-center justify-between text-[9px]">
          <span className="font-semibold text-white/85">Chicken Biryani</span>
          <span className="font-bold text-white">₹249</span>
        </div>
        <div className="mb-2 flex items-center gap-1 text-[8px] text-white/40">
          <span>★ 4.8</span>
          <span>·</span>
          <span>Biryani House</span>
        </div>
        <div className="flex h-7 items-center justify-center rounded-lg bg-[#FF7A00] text-[10px] font-bold text-black">
          Add to Cart
        </div>
      </div>
    </div>
  );
}

function PhotoCard({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <div className="cine-photo relative h-full min-h-[240px] overflow-hidden rounded-2xl">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute bottom-3 left-3 right-3">
        <span className="cine-glass inline-block rounded-full px-3 py-1 text-[10px] font-semibold text-white/85">
          {caption}
        </span>
      </div>
    </div>
  );
}

export function EcosystemVisual() {
  return (
    <section
      className="relative overflow-hidden py-20 sm:py-24"
      aria-labelledby="ecosystem-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#FF7A00]">
            How it works
          </p>
          <h2
            id="ecosystem-heading"
            className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl"
          >
            One connected food ecosystem
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/50">
            Orders flow directly. Customers stay yours.
          </p>
        </div>

        {/* Desktop: horizontal stages */}
        <div className="hidden items-stretch md:grid md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
          <div className="flex flex-col gap-3">
            <StageLabel icon={<Store size={13} />} title="Restaurant" />
            <PhotoCard
              src={IMG.restaurantInterior.url}
              alt={IMG.restaurantInterior.alt}
              caption="Your kitchen, your brand"
            />
          </div>
          <Connector label="Orders in" />
          <div className="flex flex-col gap-3">
            <StageLabel icon={<ChefHat size={13} />} title="BhojanOS" />
            <DashboardMockup />
          </div>
          <Connector label="Direct" />
          <div className="flex flex-col gap-3">
            <StageLabel icon={<Smartphone size={13} />} title="OrderBhojan" />
            <div className="flex flex-1 items-center">
              <PhoneMockup />
            </div>
          </div>
          <Connector label="Delivered" />
          <div className="flex flex-col gap-3">
            <StageLabel icon={<User size={13} />} title="Customer" />
            <PhotoCard
              src={IMG.dining.url}
              alt={IMG.dining.alt}
              caption="A regular, not a lead"
            />
          </div>
        </div>

        {/* Mobile: vertical timeline */}
        <div className="flex flex-col md:hidden">
          <div className="flex flex-col gap-3">
            <StageLabel icon={<Store size={13} />} title="Restaurant" />
            <PhotoCard
              src={IMG.restaurantInterior.url}
              alt={IMG.restaurantInterior.alt}
              caption="Your kitchen, your brand"
            />
          </div>
          <Connector label="Orders in" />
          <div className="flex flex-col gap-3">
            <StageLabel icon={<ChefHat size={13} />} title="BhojanOS" />
            <DashboardMockup />
          </div>
          <Connector label="Direct" />
          <div className="flex flex-col gap-3">
            <StageLabel icon={<Smartphone size={13} />} title="OrderBhojan" />
            <PhoneMockup />
          </div>
          <Connector label="Delivered" />
          <div className="flex flex-col gap-3">
            <StageLabel icon={<User size={13} />} title="Customer" />
            <PhotoCard
              src={IMG.dining.url}
              alt={IMG.dining.alt}
              caption="A regular, not a lead"
            />
          </div>
        </div>

        <p className="mt-10 text-center text-base font-semibold text-white/70">
          Orders flow directly. <span className="text-[#FF7A00]">Customers stay yours.</span>
        </p>
      </div>
    </section>
  );
}

export default EcosystemVisual;

