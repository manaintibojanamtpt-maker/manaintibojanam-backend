import { FeaturePlaceholderPage } from '@/app/pages/FeaturePlaceholderPage';
import { useRestaurantFeatureEnabled } from '../hooks/useRestaurantFeature';
import { RestaurantExperiencePage } from './RestaurantExperiencePage';

export function RestaurantRoutePage() {
  const enabled = useRestaurantFeatureEnabled();
  if (enabled) return <RestaurantExperiencePage />;
  return <FeaturePlaceholderPage feature="Restaurant" milestone="M5" />;
}
