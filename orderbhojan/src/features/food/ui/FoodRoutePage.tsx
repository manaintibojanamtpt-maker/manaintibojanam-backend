import { FeaturePlaceholderPage } from '@/app/pages/FeaturePlaceholderPage';
import { useFoodFeatureEnabled } from '../hooks/useFoodFeature';
import { OrderBhojanFoodExperience as FoodExperiencePage } from '@/presentation/food';

export function FoodRoutePage() {
  const enabled = useFoodFeatureEnabled();
  if (enabled) return <FoodExperiencePage />;
  return <FeaturePlaceholderPage feature="Menu" milestone="M6" />;
}
