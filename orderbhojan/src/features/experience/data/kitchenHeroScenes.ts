import type { FoodPhotoAssetId } from './food-photo-manifest';
import type { HomeHeroConfig, HomeHeroSlide } from '@/types/marketplace-home-hero';

export interface KitchenHeroScene {
  readonly id: string;
  readonly assetId: FoodPhotoAssetId;
  readonly imageAlt: string;
  readonly subline: string;
  readonly cta?: string;
  readonly ctaPath?: string;
}

/** Curated 3-scene rotation — licensed Unsplash / local HD assets via food-photo-manifest */
export const KITCHEN_HERO_SCENES: readonly KitchenHeroScene[] = [
  {
    id: 'biryani',
    assetId: 'hero-biryani',
    imageAlt: 'Steaming chicken biryani with saffron rice',
    subline: 'Signature biryani — slow-cooked and sealed for delivery',
    cta: 'Order biryani',
    ctaPath: '/search?q=biryani',
  },
  {
    id: 'thali',
    assetId: 'hero-thali',
    imageAlt: 'Fresh vegetarian thali with dal, vegetables, and roti',
    subline: 'Balanced meal trays — fresh, homestyle portions',
    cta: 'Browse meals',
    ctaPath: '/search?q=meals',
  },
  {
    id: 'tiffin',
    assetId: 'hero-tiffin',
    imageAlt: 'Crisp dosa with chutney on a brass plate',
    subline: 'South Indian plates, made fresh after you order',
    cta: 'Explore tiffins',
    ctaPath: '/search?q=dosa',
  },
] as const;

export const KITCHEN_HERO_HEADLINE = 'Fresh home-cooked meals, delivered hot';
export const KITCHEN_HERO_EYEBROW = 'OrderBhojan · home kitchens';
export const KITCHEN_HERO_ROTATION_MS = 12_000;

export const DEFAULT_HOME_HERO_CONFIG: HomeHeroConfig = {
  eyebrow: KITCHEN_HERO_EYEBROW,
  headline: KITCHEN_HERO_HEADLINE,
  rotationIntervalMs: KITCHEN_HERO_ROTATION_MS,
  slides: KITCHEN_HERO_SCENES.map(
    (scene): HomeHeroSlide => ({
      id: scene.id,
      assetId: scene.assetId,
      imageAlt: scene.imageAlt,
      subline: scene.subline,
      cta: scene.cta,
      ctaPath: scene.ctaPath,
    }),
  ),
};
