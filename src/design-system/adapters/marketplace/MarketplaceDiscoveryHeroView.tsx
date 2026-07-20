import React from 'react';

export type MarketplaceDiscoveryHeroSlideKind = 'food' | 'offer';

export interface MarketplaceDiscoveryHeroSlide {
  readonly id: string;
  readonly src: string;
  readonly webpSrcSet?: string;
  readonly avifSrcSet?: string;
  readonly alt: string;
  readonly kind?: MarketplaceDiscoveryHeroSlideKind;
  readonly subline?: string;
  readonly headline?: string;
  readonly cta?: string;
  readonly ctaPath?: string;
  readonly offerBadge?: string;
  readonly restaurantName?: string;
  readonly restaurantSlug?: string;
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
  readonly ctaLabel?: string;
  readonly onCtaClick?: () => void;
  readonly onSlideSelect?: (index: number) => void;
}

function slideIsOffer(slide: MarketplaceDiscoveryHeroSlide | undefined): boolean {
  return slide?.kind === 'offer' || Boolean(slide?.offerBadge);
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
  ctaLabel,
  onCtaClick,
  onSlideSelect,
}) => {
  const activeSlide = slides[activeIndex] ?? slides[0];
  const isOfferSlide = slideIsOffer(activeSlide);
  const displayHeadline = activeSlide?.headline ?? headline;
  const displaySubline = activeSlide?.subline ?? subline;
  const displayCta = activeSlide?.cta ?? ctaLabel;
  const displayEyebrow = isOfferSlide ? 'Limited-time deal' : eyebrow;

  return (
    <section
      className="relative min-h-[min(72vh,640px)] overflow-hidden border-b border-white/5 bg-[#050403]"
      aria-label="Home kitchens"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] bg-gradient-to-b from-[#FF7A00]/16 via-[#FF7A00]/6 to-transparent"
        style={{ height: 'calc(100% + env(safe-area-inset-top, 0px))' }}
        aria-hidden
      />
      <div className="absolute inset-0 z-0">
        {slides.map((slide, index) => {
          const offerSlide = slideIsOffer(slide);
          const isActive = index === activeIndex;

          return (
            <picture
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-[2200ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                isActive ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
              aria-hidden={!isActive}
            >
              {slide.avifSrcSet ? (
                <source type="image/avif" srcSet={slide.avifSrcSet} sizes="103vw" />
              ) : null}
              {slide.webpSrcSet ? (
                <source type="image/webp" srcSet={slide.webpSrcSet} sizes="103vw" />
              ) : null}
              <img
                src={slide.src}
                alt=""
                className={`ds-hero-photo object-cover object-center ${
                  animated && isActive ? 'ds-hero-photo--ken-burns' : 'h-full w-full'
                } ${
                  offerSlide
                    ? 'brightness-[0.46] contrast-[1.1] saturate-[1.14]'
                    : 'brightness-[0.5] contrast-[1.08] saturate-[1.1]'
                }`}
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
              />
              {offerSlide && slide.offerBadge ? (
                <div
                  className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-[2] flex justify-start sm:inset-x-6"
                  aria-hidden
                >
                  <div className="max-w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#050403]/55 px-4 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-md">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#FFB366]">
                      Deal live now
                    </p>
                    <p className="mt-1 text-lg font-extrabold leading-tight tracking-[-0.02em] text-white sm:text-xl">
                      {slide.offerBadge}
                    </p>
                    {slide.restaurantName ? (
                      <p className="mt-1 text-xs font-medium text-white/72">{slide.restaurantName}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </picture>
          );
        })}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/84 to-[#030303]/24" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,122,0,0.14),transparent_58%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,122,0,0.08)_0%,transparent_42%)]" />
        <div className="absolute inset-0 bg-black/18" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[min(72vh,640px)] max-w-5xl flex-col justify-end px-4 pb-8 pt-12 sm:px-6 sm:pb-10 sm:pt-16 lg:px-8">
        <div
          key={activeSlide?.id ?? 'hero-copy'}
          className={`max-w-2xl motion-reduce:transition-none ${animated ? 'ds-hero-copy-in' : ''}`}
          aria-live="polite"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FF7A00] sm:text-[11px]">
            {displayEyebrow}
          </p>
          <h1
            className={`mt-3 text-balance text-[2rem] font-extrabold leading-[1.04] tracking-[-0.035em] text-white sm:text-[2.75rem] lg:text-[3.25rem] ${
              isOfferSlide
                ? 'bg-gradient-to-r from-white via-[#FFF4EA] to-[#FFB366] bg-clip-text text-transparent'
                : ''
            }`}
          >
            {displayHeadline}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/74 sm:text-base">
            {displaySubline}
          </p>

          {displayCta && onCtaClick ? (
            <button
              type="button"
              onClick={onCtaClick}
              className={`mt-5 inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-bold tracking-wide text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A00] active:scale-[0.98] ${
                isOfferSlide
                  ? 'bg-[#FF7A00] shadow-[0_10px_40px_rgba(255,122,0,0.38)] hover:bg-[#ff8f26] hover:shadow-[0_12px_44px_rgba(255,122,0,0.45)]'
                  : 'border border-white/15 bg-white/10 backdrop-blur-sm hover:border-[#FF7A00]/40 hover:bg-[#FF7A00]/90 hover:shadow-[0_10px_36px_rgba(255,122,0,0.32)]'
              }`}
            >
              {displayCta}
              <span aria-hidden className="text-base leading-none">
                →
              </span>
            </button>
          ) : null}
        </div>

        {locationSlot ? <div className="mt-5">{locationSlot}</div> : null}

        <div className="mt-5 max-w-2xl">{searchSlot}</div>

        {animated && slides.length > 1 ? (
          <div className="mt-6 flex items-center gap-2.5" role="tablist" aria-label="Hero scenes">
            {slides.map((slide, index) => {
              const offerSlide = slideIsOffer(slide);
              const isActive = index === activeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={
                    offerSlide
                      ? `Offer: ${slide.restaurantName ?? slide.headline ?? `Slide ${index + 1}`}`
                      : `Food scene ${index + 1}`
                  }
                  onClick={() => onSlideSelect?.(index)}
                  className={`h-1.5 min-w-1.5 rounded-full transition-all duration-300 touch-manipulation ${
                    isActive
                      ? offerSlide
                        ? 'w-8 bg-[#FF7A00] shadow-[0_0_12px_rgba(255,122,0,0.55)]'
                        : 'w-8 bg-white shadow-[0_0_10px_rgba(255,255,255,0.35)]'
                      : offerSlide
                        ? 'w-1.5 bg-[#FF7A00]/40'
                        : 'w-1.5 bg-white/30'
                  }`}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      {activeSlide ? <span className="sr-only">{activeSlide.alt}</span> : null}
    </section>
  );
};

export default MarketplaceDiscoveryHeroView;
