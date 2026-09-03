import React, { useState } from 'react';
import { Star, Plus, Check, ArrowRight } from 'lucide-react';
import { CINEMATIC_FOOD_CARDS, CINEMATIC_ENV_IMAGES } from '../../config/marketingFoodImages';
import { useScrollReveal } from '../../hooks/useScrollReveal';

/**
 * Food Discovery V2 — cinematic gallery with 3D tilt on hover.
 * Cards overlap slightly; mouse position drives subtle perspective tilt.
 * Copy reduced; imagery dominant.
 */

const IMG = CINEMATIC_ENV_IMAGES;

function FoodCard({ item, index }: { item: (typeof CINEMATIC_FOOD_CARDS)[number]; index: number }) {
  const [added, setAdded] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  /* 3D tilt: track mouse position within card, set CSS vars. */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--tilt-y', `${px * 8}deg`);
    el.style.setProperty('--tilt-x', `${-py * 8}deg`);
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (el) {
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
    }
  };

  return (
    <article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="cine-food-card cine-tilt group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <a
        href="https://www.orderbhojan.com"
        target="_blank"
        rel="noopener noreferrer"
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
        aria-label={`Order ${item.name} from ${item.restaurant} on OrderBhojan`}
      >
        <div className="cine-photo relative aspect-[3/4] overflow-hidden">
          <img
            src={item.url}
            alt={item.alt}
            loading="lazy"
            decoding="async"
            className="cine-food-img absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/85 backdrop-blur-sm">
            {item.category}
          </span>
        </div>

        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-white">{item.name}</h3>
              <p className="mt-0.5 truncate text-[11px] text-white/45">{item.restaurant}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] font-bold text-white/85">
              <Star size={10} className="fill-[#FF7A00] text-[#FF7A00]" aria-hidden />
              {item.rating}
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-base font-extrabold text-white">{item.price}</span>
          </div>
        </div>
      </a>

      <button
        type="button"
        aria-label={`Add ${item.name} to order (continues on OrderBhojan)`}
        onClick={() => {
          setAdded(true);
          window.setTimeout(() => setAdded(false), 1400);
        }}
        className={`absolute bottom-3.5 right-3.5 flex h-9 w-9 items-center justify-center rounded-full text-black shadow-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
          added
            ? 'scale-110 bg-[#34D399]'
            : 'bg-[#FF7A00] group-hover:scale-110 group-hover:shadow-[0_0_18px_rgba(255,122,0,0.55)]'
        }`}
      >
        {added ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
      </button>
    </article>
  );
}

function MiniPhone() {
  return (
    <div className="cine-float cine-glass cine-glass-accent cine-phone-hover w-full max-w-[150px] rounded-[20px] p-1.5">
      <div className="rounded-[14px] bg-[#0A0A0A] p-2 text-center">
        <div className="mb-2 text-[10px] font-bold text-white">OrderBhojan</div>
        <img
          src={IMG.foodTable.url}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="cine-food-img mb-2 h-24 w-full rounded-lg object-cover"
        />
        <div className="text-[9px] text-white/45">Direct to kitchen</div>
      </div>
    </div>
  );
}

export function FoodDiscoverySection() {
  const scrollRef = useScrollReveal<HTMLDivElement>();

  return (
    <section
      className="relative overflow-hidden py-20 sm:py-24"
      aria-labelledby="discovery-heading"
      ref={scrollRef}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[#FF7A00]/[0.06] blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center cine-reveal">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#FF7A00]">
            For customers
          </p>
          <h2
            id="discovery-heading"
            className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl"
          >
            Food worth ordering.
          </h2>
        </div>

        {/* Overlapping featured row — large left, staggered right */}
        <div className="grid gap-5 md:grid-cols-12">
          {/* Featured large card */}
          <div className="md:col-span-5 cine-reveal">
            <FoodCard item={CINEMATIC_FOOD_CARDS[0]} index={0} />
          </div>

          {/* Staggered smaller cards */}
          <div className="grid grid-cols-2 gap-5 md:col-span-7">
            {CINEMATIC_FOOD_CARDS.slice(1, 5).map((item, i) => (
              <div key={item.name} className="cine-reveal" style={{ animationDelay: `${(i + 1) * 80}ms` }}>
                <FoodCard item={item} index={i + 1} />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row: phone + remaining dishes */}
        <div className="mt-12 grid items-center gap-8 md:grid-cols-12">
          <div className="md:col-span-4 cine-reveal">
            <h3 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Order on <span className="text-[#FF7A00]">OrderBhojan</span>
            </h3>
            <a
              href="https://www.orderbhojan.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-5 inline-flex items-center gap-2 rounded-full bg-[#FF7A00] px-7 py-3.5 text-sm font-extrabold uppercase tracking-wide text-black transition-all duration-300 hover:shadow-[0_0_28px_rgba(255,122,0,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Order Food
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </a>
          </div>
          <div className="grid grid-cols-2 gap-5 md:col-span-5">
            {CINEMATIC_FOOD_CARDS.slice(5, 7).map((item, i) => (
              <div key={item.name} className="cine-reveal" style={{ animationDelay: `${(i + 5) * 80}ms` }}>
                <FoodCard item={item} index={i + 5} />
              </div>
            ))}
          </div>
          <div className="hidden items-center justify-center md:col-span-3 md:flex cine-reveal">
            <MiniPhone />
          </div>
        </div>
      </div>
    </section>
  );
}

export default FoodDiscoverySection;

