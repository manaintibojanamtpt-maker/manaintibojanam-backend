export const M3_MILESTONE = 'M3';

export { DiscoveryProvider } from './ui/DiscoveryProvider';
export { DiscoveryHomeFeed } from './ui/DiscoveryHomeFeed';
export { DiscoveryCollectionRail } from './ui/DiscoveryCollectionRail';
export { DiscoveryRestaurantCard } from './ui/DiscoveryRestaurantCard';
export { DiscoveryFiltersBar } from './ui/DiscoveryFiltersBar';
export { useDiscoveryFeatureEnabled } from './hooks/useDiscoveryFeature';
export { useDiscoveryHome, useDiscoveryLocationInvalidation } from './hooks/useDiscoveryHome';
export { useDiscoveryCollection } from './hooks/useDiscoveryCollection';
export { discoveryKeys } from './hooks/discoveryQueryKeys';
export {
  loadDiscoveryHome,
  loadDiscoveryCollection,
  resolveDiscoveryCoords,
  resolveActiveDeliveryLocation,
  resolveActiveDeliveryCoords,
} from './engine/discoveryEngine';
export { applyDiscoveryFilters, sortRestaurants } from './domain/filters';
export { DISCOVERY_COLLECTIONS, HOME_COLLECTION_IDS } from './domain/collections';
export { useDiscoveryFilterStore } from './store/discoveryFilterStore';
