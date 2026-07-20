import type { FoodPhotoAssetId } from './food-photo-manifest';
import type { HomeHeroConfig, HomeHeroSlide } from '@/types/marketplace-home-hero';

export interface KitchenHeroScene {
  readonly id: string;
  readonly assetId: FoodPhotoAssetId;
  readonly imageAlt: string;
  readonly headline?: string;
  readonly subline: string;
  readonly cta?: string;
  readonly ctaPath?: string;
}

/** Curated 3-scene rotation — licensed Unsplash / local HD assets via food-photo-manifest */
export const KITCHEN_HERO_SCENES: readonly KitchenHeroScene[] = [
  {
    id: 'biryani',
    assetId: 'hero-biryani',
    imageAlt: 'Steaming chicken biryani with saffron rice in a brass handi',
    headline: 'Biryani that hits different',
    subline: 'Dum-sealed, saffron-kissed — hot Hyderabadi biryani at your door',
    cta: 'Order biryani',
    ctaPath: '/search?q=biryani',
  },
  {
    id: 'thali',
    assetId: 'hero-thali',
    imageAlt: 'Colourful vegetarian thali with dal, sabzi, roti, and rice',
    headline: 'A full thali, delivered fresh',
    subline: 'Balanced homestyle trays — dal, sabzi, roti, made to order',
    cta: 'Browse thalis',
    ctaPath: '/search?q=meals',
  },
  {
    id: 'tiffin',
    assetId: 'hero-tiffin',
    imageAlt: 'Crisp golden dosa with chutney and sambar on a brass plate',
    headline: 'South Indian mornings',
    subline: 'Crisp dosas, fluffy idlis & filter coffee — breakfast, delivered',
    cta: 'Explore tiffins',
    ctaPath: '/search?q=dosa',
  },
] as const;

export const KITCHEN_HERO_HEADLINE = 'What are you craving tonight?';
export const KITCHEN_HERO_EYEBROW = 'Home kitchens · delivered hot';
export const KITCHEN_HERO_ROTATION_MS = 12_000;

export const DEFAULT_HOME_HERO_CONFIG: HomeHeroConfig = {
  eyebrow: KITCHEN_HERO_EYEBROW,
  headline: KITCHEN_HERO_HEADLINE,
  rotationIntervalMs: KITCHEN_HERO_ROTATION_MS,
  includeDiscoveryOffers: true,
  maxOfferSlides: 2,
  slides: KITCHEN_HERO_SCENES.map(
    (scene): HomeHeroSlide => ({
      id: scene.id,
      kind: 'food',
      assetId: scene.assetId,
      imageAlt: scene.imageAlt,
      headline: scene.headline,
      subline: scene.subline,
      cta: scene.cta,
      ctaPath: scene.ctaPath,
    }),
  ),
};
