import type { FoodPublic } from '@/types/marketplace-food';
import type { FoodCustomizationStoryViewModel } from '@bhojan/storefront-design-system/food/types';

export function mapFoodToCustomizationStory(food: FoodPublic): FoodCustomizationStoryViewModel {
  return {
    chefNote: food.chefNote,
    cookingStyle: food.cookingStyle,
    servingSize: food.servingSize,
    popularPairing: food.popularPairing,
    ingredients: food.ingredients,
    dietaryLabels: food.dietaryLabels,
  };
}
