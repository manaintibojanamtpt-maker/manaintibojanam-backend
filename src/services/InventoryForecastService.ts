import { getRecipes, generateFallbackRecipe } from './RecipeService';
import { Forecast, InventoryForecastRequirement, MenuItem } from '../types';
import { fetchOwnerMenuItems } from '../lib/ownerMenuApi';

/**
 * Converts a Demand Forecast into raw material requirements using Recipe Intelligence.
 */
export const generateInventoryForecast = async (tenantId: string, forecast: Forecast): Promise<InventoryForecastRequirement[]> => {
  if (!tenantId || !forecast || forecast.expectedOrders === 0) return [];

  try {
    const { items } = await fetchOwnerMenuItems(tenantId);
    const activeItems = (items ?? []).filter((item) => item.isActive !== false) as MenuItem[];
    if (activeItems.length === 0) return [];

    const configuredRecipes = await getRecipes(tenantId);

    const ingredientMap = new Map<string, InventoryForecastRequirement>();

    let totalWeight = 0;
    activeItems.forEach((item) => {
      totalWeight += item.isPopular || item.isBestSeller ? 3 : 1;
    });

    activeItems.forEach((item) => {
      const weight = item.isPopular || item.isBestSeller ? 3 : 1;
      const expectedItemSales = Math.round(forecast.expectedOrders * (weight / totalWeight));

      if (expectedItemSales === 0) return;

      let recipe = configuredRecipes.find((r) => r.menuItemId === item.id);
      if (!recipe) {
        recipe = generateFallbackRecipe(item);
      }

      recipe.ingredients.forEach((ing) => {
        const key = ing.ingredient.toLowerCase();
        const requiredQty = ing.quantity * expectedItemSales;

        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!;
          existing.quantityRequired += requiredQty;
        } else {
          ingredientMap.set(key, {
            ingredient: ing.ingredient,
            quantityRequired: requiredQty,
            unit: ing.unit,
            riskLevel: 'Low',
            reasoning: `Based on expected demand of ${expectedItemSales} units for items like ${item.name}.`,
          });
        }
      });
    });

    const requirements = Array.from(ingredientMap.values());

    requirements.forEach((req) => {
      if (req.quantityRequired > 5000 && req.unit === 'grams') {
        req.riskLevel = 'Medium';
      }
      if (req.quantityRequired > 20000 && req.unit === 'grams') {
        req.riskLevel = 'High';
      }
      if (req.ingredient.toLowerCase() === 'chicken' && req.quantityRequired > 10000) {
        req.riskLevel = 'Critical';
      }
    });

    return requirements.sort((a, b) => b.quantityRequired - a.quantityRequired);
  } catch (error) {
    console.error('Error generating inventory forecast:', error);
    return [];
  }
};
