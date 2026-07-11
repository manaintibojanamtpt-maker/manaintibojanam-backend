import React from 'react';

export interface MarketplaceDiscoveryHeroSlide {
  readonly id: string;
  readonly src: string;
  readonly webpSrcSet?: string;
  readonly avifSrcSet?: string;
  readonly alt: string;
}

export interface MarketplaceDiscoveryHeroViewProps {
  readonly eyebrow: string;
  readonly headline: string;
  readonly subline: string;
  readonly slides: readonly MarketplaceDiscoveryHeroSlide[];
  readonly activeIndex: number;
  readonly animated: boolean;
  readonly searchSlot: React.ReactNode;
  readonly locationSlot?: React.ReactNode;
}

export const MarketplaceDiscoveryHeroView: React.FC<MarketplaceDiscoveryHeroViewProps> = ({
  eyebrow,
  headline,
  subline,
  slides,
  activeIndex,
  animated,
  searchSlot,
  locationSlot = null,
}) => {
  const activeSlide = slides[activeIndex] ?? slides[0];

  return (
    <section
      className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-[#FF7A00]/10 to-transparent"
      aria-label="Home kitchens"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="absolute inset-0 z-0">
        {slides.map((slide, index) => {
          const isActive = !animated ? index === 0 : index === activeIndex;
          return (
            <picture
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden
            >
              {slide.avifSrcSet ? <source type="image/avif" srcSet={slide.avifSrcSet} sizes="100vw" /> : null}
              {slide.webpSrcSet ? <source type="image/webp" srcSet={slide.webpSrcSet} sizes="100vw" /> : null}
              <img
                src={slide.src}
                alt=""
                className={`h-full w-full object-cover brightness-[0.55] contrast-[1.05] ${
                  animated && isActive ? 'scale-105' : ''
                }`}
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
              />
            </picture>
          );
        })}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/80 to-[#030303]/30" />
        <div className="absolute inset-0 bg-black/25" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#FF7A00]">{eyebrow}</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          {headline}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/70 sm:text-base" key={activeSlide?.id ?? 'subline'}>
          {subline}
        </p>

        {locationSlot ? <div className="mt-5">{locationSlot}</div> : null}

        <div className="mt-6 max-w-2xl">{searchSlot}</div>

        {animated && slides.length > 1 ? (
          <div className="mt-5 flex gap-2" aria-hidden>
            {slides.map((slide, index) => (
              <span
                key={slide.id}
                className={`h-1.5 rounded-full transition-all ${
                  index === activeIndex ? 'w-6 bg-[#FF7A00]' : 'w-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {activeSlide ? <span className="sr-only">{activeSlide.alt}</span> : null}
    </section>
  );
};

export default MarketplaceDiscoveryHeroView;
