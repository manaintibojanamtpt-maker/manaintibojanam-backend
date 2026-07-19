export type HomeHeroSlideKind = 'food' | 'offer';

export interface HomeHeroSlide {
  readonly id: string;
  readonly kind?: HomeHeroSlideKind;
  readonly headline?: string;
  readonly subline: string;
  readonly imageAlt: string;
  readonly imageUrl?: string;
  readonly assetId?: string;
  readonly cta?: string;
  readonly ctaPath?: string;
  /** Discount badge copy — owner/platform offer slides */
  readonly offerBadge?: string;
  readonly restaurantName?: string;
  readonly restaurantSlug?: string;
}

export interface HomeHeroConfig {
  readonly eyebrow: string;
  readonly headline: string;
  readonly rotationIntervalMs: number;
  readonly slides: readonly HomeHeroSlide[];
  /** Pull live owner offers into hero carousel when true (default: true) */
  readonly includeDiscoveryOffers?: boolean;
  /** Max discovery offer slides merged into carousel (default: 2) */
  readonly maxOfferSlides?: number;
  readonly updatedAt?: string;
  readonly updatedBy?: string;
}
