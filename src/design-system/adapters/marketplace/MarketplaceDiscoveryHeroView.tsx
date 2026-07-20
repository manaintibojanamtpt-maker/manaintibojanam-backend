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
  /** Sync Ken Burns + crossfade timing with carousel interval (default 12s) */
  readonly slideDurationMs?: number;
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
  slideDurationMs = 12_000,
}) => {
  const activeSlide = slides[activeIndex] ?? slides[0];
  const isOfferSlide = slideIsOffer(activeSlide);
  const displayHeadline = activeSlide?.headline ?? headline;
  const displaySubline = activeSlide?.subline ?? subline;
  const displayCta = activeSlide?.cta ?? ctaLabel;
  const displayEyebrow = isOfferSlide ? 'Limited-time deal' : eyebrow;
  const kenBurnsSeconds = Math.max(10, Math.round(slideDurationMs / 1000));

  return (
    <section
      className="ds-discovery-hero relative min-h-[min(78vh,720px)] overflow-hidden border-b border-white/[0.04] bg-[#050403]"
      aria-label="Home kitchens"
      style={
        {
          paddingTop: 'env(safe-area-inset-top, 0px)',
          '--ds-hero-ken-burns-duration': `${kenBurnsSeconds}s`,
          '--ds-hero-crossfade-duration': '2s',
        } as React.CSSProperties
      }
    >
      <div className="ds-discovery-hero__media absolute inset-0 z-0">
        {slides.map((slide, index) => {
          const offerSlide = slideIsOffer(slide);
          const isActive = index === activeIndex;
          const kenBurnsVariant = index % 2 === 0 ? 'ds-hero-photo--ken-burns' : 'ds-hero-photo--ken-burns-alt';

          return (
            <picture
              key={slide.id}
              className={`ds-hero-slide absolute inset-0 ${isActive ? 'ds-hero-slide--active' : ''}`}
              aria-hidden={!isActive}
            >
              {slide.avifSrcSet ? (
                <source type="image/avif" srcSet={slide.avifSrcSet} sizes="100vw" />
              ) : null}
              {slide.webpSrcSet ? (
                <source type="image/webp" srcSet={slide.webpSrcSet} sizes="100vw" />
              ) : null}
              <img
                src={slide.src}
                alt=""
                className={`ds-hero-photo h-full w-full object-cover object-center ${
                  animated && isActive ? kenBurnsVariant : ''
                } ${
                  offerSlide
                    ? 'brightness-[0.66] contrast-[1.14] saturate-[1.12]'
                    : 'brightness-[0.78] contrast-[1.1] saturate-[1.1]'
                }`}
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
              />
            </picture>
          );
        })}

        <div className="ds-discovery-hero__vignette pointer-events-none absolute inset-0" aria-hidden />
        <div className="ds-discovery-hero__spotlight pointer-events-none absolute inset-0" aria-hidden />
        <div className="ds-discovery-hero__scrim pointer-events-none absolute inset-x-0 bottom-0 h-[78%]" aria-hidden />
        <div className="ds-discovery-hero__readability pointer-events-none absolute inset-x-0 bottom-0 h-[52%]" aria-hidden />
        <div className="ds-discovery-hero__glow pointer-events-none absolute inset-0" aria-hidden />
        {animated ? (
          <div className="ds-discovery-hero__steam pointer-events-none absolute inset-0" aria-hidden />
        ) : null}
        <div className="ds-discovery-hero__edge-fade pointer-events-none absolute inset-0" aria-hidden />
      </div>

      {activeSlide && slideIsOffer(activeSlide) && activeSlide.offerBadge ? (
        <div
          className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+5.5rem)] z-[2] flex justify-end sm:inset-x-6 lg:top-[calc(env(safe-area-inset-top,0px)+6rem)]"
          aria-hidden
        >
          <div className="ds-discovery-hero__offer-card max-w-[min(19rem,calc(100vw-2rem))] rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#FFB366]">
              Deal live now
            </p>
            <p className="mt-1 text-lg font-extrabold leading-tight tracking-[-0.02em] text-white sm:text-xl">
              {activeSlide.offerBadge}
            </p>
            {activeSlide.restaurantName ? (
              <p className="mt-1 text-xs font-medium text-white/76">{activeSlide.restaurantName}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="relative z-10 mx-auto flex min-h-[min(78vh,720px)] max-w-5xl flex-col justify-end px-4 pb-8 pt-14 sm:px-6 sm:pb-10 sm:pt-16 lg:px-8">
        <div
          key={activeSlide?.id ?? 'hero-copy'}
          className={`ds-discovery-hero__copy max-w-xl motion-reduce:transition-none ${animated ? 'ds-hero-copy-in' : ''}`}
          aria-live="polite"
        >
          <p className="ds-discovery-hero__eyebrow text-[10px] font-bold uppercase tracking-[0.28em] sm:text-[11px]">
            {displayEyebrow}
          </p>
          <h1
            className={`ds-discovery-hero__headline mt-2.5 text-balance text-[2rem] font-extrabold leading-[1.02] tracking-[-0.035em] sm:mt-3 sm:text-[2.65rem] lg:text-[3rem] ${
              isOfferSlide ? 'ds-discovery-hero__headline--offer' : ''
            }`}
          >
            {displayHeadline}
          </h1>
          <p className="ds-discovery-hero__subline mt-2.5 max-w-md text-[15px] leading-relaxed sm:mt-3 sm:text-base">
            {displaySubline}
          </p>

          {displayCta && onCtaClick ? (
            <button
              type="button"
              onClick={onCtaClick}
              className="ds-discovery-hero__cta mt-5 inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-bold tracking-wide text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A00] active:scale-[0.98]"
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

        {slides.length > 1 ? (
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
