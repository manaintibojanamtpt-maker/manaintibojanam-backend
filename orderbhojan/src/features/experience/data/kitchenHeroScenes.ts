import type { FoodPhotoAssetId } from './food-photo-manifest';

export interface KitchenHeroScene {
  readonly id: string;
  readonly assetId: FoodPhotoAssetId;
  readonly imageAlt: string;
  readonly subline: string;
}

/** Curated 3-scene rotation — licensed Unsplash via food-photo-manifest */
export const KITCHEN_HERO_SCENES: readonly KitchenHeroScene[] = [
  {
    id: 'biryani',
    assetId: 'hero-biryani',
    imageAlt: 'Close-up of steaming Hyderabadi chicken dum biryani with saffron rice',
    subline: 'Hyderabadi chicken biryani — sealed dum, delivered warm',
  },
  {
    id: 'thali',
    assetId: 'hero-thali',
    imageAlt: 'Fresh vegetarian thali with dal, sabzi, and roti',
    subline: 'Comfort thalis, packed like your mother would',
  },
  {
    id: 'tiffin',
    assetId: 'hero-tiffin',
    imageAlt: 'Crisp dosa with chutney on a brass plate',
    subline: 'South Indian tiffins, made after you order',
  },
] as const;

export const KITCHEN_HERO_HEADLINE = 'Ghar ka khana, delivered warm';
