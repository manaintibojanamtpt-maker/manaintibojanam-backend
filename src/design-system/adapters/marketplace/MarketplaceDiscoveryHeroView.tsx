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
  readonly onSlideSelect?: (index: number) => void;
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
  onSlideSelect,
}) => {
  const activeSlide = slides[activeIndex] ?? slides[0];

  return (
    <section
      className="relative overflow-hidden border-b border-white/5 bg-[#070504]"
      aria-label="Home kitchens"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] bg-gradient-to-b from-[#FF7A00]/12 to-transparent"
        style={{ height: 'calc(100% + env(safe-area-inset-top, 0px))' }}
        aria-hidden
      />
      <div className="absolute inset-0 z-0">
        {activeSlide ? (
          <picture className="absolute inset-0" aria-hidden>
            {activeSlide.avifSrcSet ? (
              <source type="image/avif" srcSet={activeSlide.avifSrcSet} sizes="100vw" />
            ) : null}
            {activeSlide.webpSrcSet ? (
              <source type="image/webp" srcSet={activeSlide.webpSrcSet} sizes="100vw" />
            ) : null}
            <img
              src={activeSlide.src}
              alt=""
              className={`h-full w-full object-cover brightness-[0.55] contrast-[1.05] ${
                animated ? 'scale-105' : ''
              }`}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
        ) : null}
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
          <div className="mt-5 flex gap-2" role="tablist" aria-label="Hero scenes">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={`Scene ${index + 1}`}
                onClick={() => onSlideSelect?.(index)}
                className={`h-2 min-w-2 rounded-full transition-all touch-manipulation ${
                  index === activeIndex ? 'w-6 bg-[#FF7A00]' : 'w-2 bg-white/35'
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
