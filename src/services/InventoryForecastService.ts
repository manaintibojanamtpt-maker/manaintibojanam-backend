import { getRecipes, generateFallbackRecipe } from './RecipeService';
import { Forecast, InventoryForecastRequirement, MenuItem } from '../types';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';

/**
 * Converts a Demand Forecast into raw material requirements using Recipe Intelligence.
 */
export const generateInventoryForecast = async (tenantId: string, forecast: Forecast): Promise<InventoryForecastRequirement[]> => {
  if (!tenantId || !forecast || forecast.expectedOrders === 0) return [];

  try {
    const db = getDb();
    
    // 1. Fetch active menu items to determine likely order mix
    // In a real production system, this would use historical item-level velocity.
    const menuQuery = query(
      collection(db, 'menu'), 
      where('tenantId', '==', tenantId),
      where('isActive', '==', true)
    );
    
    const menuSnapshot = await getDocs(menuQuery);
    if (menuSnapshot.empty) return [];
    
    const activeItems = menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
    
    // 2. Fetch configured recipes
    const configuredRecipes = await getRecipes(tenantId);
    
    // 3. Aggregate ingredient requirements
    const ingredientMap = new Map<string, InventoryForecastRequirement>();
    
    // Assume even distribution for V1 heuristic, weighted slightly to 'isPopular' or 'isBestSeller'
    let totalWeight = 0;
    activeItems.forEach(item => {
      totalWeight += (item.isPopular || item.isBestSeller) ? 3 : 1;
    });

    activeItems.forEach(item => {
      const weight = (item.isPopular || item.isBestSeller) ? 3 : 1;
      const expectedItemSales = Math.round(forecast.expectedOrders * (weight / totalWeight));
      
      if (expectedItemSales === 0) return;

      // Find recipe, fallback to keyword generation if missing
      let recipe = configuredRecipes.find(r => r.menuItemId === item.id);
      if (!recipe) {
        recipe = generateFallbackRecipe(item);
      }

      // Multiply recipe ingredients by expected sales
      recipe.ingredients.forEach(ing => {
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
            riskLevel: 'Low', // We will calculate risk later
            reasoning: `Based on expected demand of ${expectedItemSales} units for items like ${item.name}.`
          });
        }
      });
    });

    const requirements = Array.from(ingredientMap.values());
    
    // 4. Calculate Risk Levels
    // In V1, since we don't have a raw material inventory DB, we'll mock risk based on high volume
    requirements.forEach(req => {
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
