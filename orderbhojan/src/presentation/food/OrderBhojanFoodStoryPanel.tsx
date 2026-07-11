import type { FoodPublic } from '@/types/marketplace-food';
import { FoodCustomizationStoryView } from '@bhojan/storefront-design-system/food/FoodCustomizationStoryView';
import { mapFoodToCustomizationStory } from './mapFoodToCustomizationStory';

export interface OrderBhojanFoodStoryPanelProps {
  readonly food: FoodPublic;
}

export function OrderBhojanFoodStoryPanel({ food }: OrderBhojanFoodStoryPanelProps) {
  return <FoodCustomizationStoryView story={mapFoodToCustomizationStory(food)} />;
}
