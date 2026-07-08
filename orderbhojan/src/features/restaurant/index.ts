export const M5_MILESTONE = 'M5';

export { RestaurantProvider } from './ui/RestaurantProvider';
export { RestaurantRoutePage } from './ui/RestaurantRoutePage';
export { RestaurantExperiencePage } from './ui/RestaurantExperiencePage';
export { useRestaurantFeatureEnabled } from './hooks/useRestaurantFeature';
export { useRestaurantExperience, useRestaurantLocationInvalidation } from './hooks/useRestaurantExperience';
export { restaurantKeys } from './hooks/restaurantQueryKeys';
export {
  loadRestaurantExperience,
  loadRestaurantGallery,
  loadRestaurantOffers,
  loadRestaurantHighlights,
  resolveRestaurantCoords,
  DEFAULT_RESTAURANT_COORDS,
} from './engine/restaurantExperienceLayer';
export {
  useRestaurantContextStore,
  fallbackRestaurantId,
} from './store/restaurantContextStore';
