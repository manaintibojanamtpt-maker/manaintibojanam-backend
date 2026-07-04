import { FeaturePlaceholderPage } from '@/app/pages/FeaturePlaceholderPage';
import { useFoodFeatureEnabled } from '../hooks/useFoodFeature';
import { FoodExperiencePage } from './FoodExperiencePage';

export function FoodRoutePage() {
  const enabled = useFoodFeatureEnabled();
  if (enabled) return <FoodExperiencePage />;
  return <FeaturePlaceholderPage feature="Menu" milestone="M6" />;
}
