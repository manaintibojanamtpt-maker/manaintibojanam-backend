export interface HomeHeroSlide {
  readonly id: string;
  readonly headline?: string;
  readonly subline: string;
  readonly imageAlt: string;
  readonly imageUrl?: string;
  readonly assetId?: string;
  readonly cta?: string;
  readonly ctaPath?: string;
}

export interface HomeHeroConfig {
  readonly eyebrow: string;
  readonly headline: string;
  readonly rotationIntervalMs: number;
  readonly slides: readonly HomeHeroSlide[];
  readonly updatedAt?: string;
  readonly updatedBy?: string;
}
