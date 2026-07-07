import { Recipe, RecipeIngredient, MenuItem } from '../types';
import { fetchOwnerRecipes, saveOwnerRecipe } from '../lib/ownerRecipesApi';

export const getRecipes = async (tenantId: string): Promise<Recipe[]> => {
  if (!tenantId) return [];
  try {
    const response = await fetchOwnerRecipes(tenantId);
    return response.recipes ?? [];
  } catch (err) {
    console.error('Error fetching recipes:', err);
    return [];
  }
};

export const saveRecipe = async (tenantId: string, menuItemId: string, ingredients: RecipeIngredient[]): Promise<boolean> => {
  if (!tenantId || !menuItemId) return false;
  try {
    await saveOwnerRecipe(tenantId, menuItemId, ingredients);
    return true;
  } catch (err) {
    console.error('Error saving recipe:', err);
    return false;
  }
};

export const getRecipeForMenuItem = async (tenantId: string, menuItemId: string): Promise<Recipe | null> => {
  if (!tenantId || !menuItemId) return null;
  try {
    const recipes = await getRecipes(tenantId);
    return recipes.find((recipe) => recipe.menuItemId === menuItemId) ?? null;
  } catch (err) {
    console.error('Error fetching recipe:', err);
    return null;
  }
};

// Fallback logic if recipes are not explicitly mapped.
// Generates an estimated ingredient list based on item name and category.
export const generateFallbackRecipe = (menuItem: MenuItem): Recipe => {
  const nameStr = menuItem.name.toLowerCase();
  const catStr = menuItem.category.toLowerCase();
  const ingredients: RecipeIngredient[] = [];

  if (nameStr.includes('biryani') || catStr.includes('rice') || nameStr.includes('rice')) {
    ingredients.push({ ingredient: 'Rice', quantity: 200, unit: 'grams' });
    ingredients.push({ ingredient: 'Oil', quantity: 50, unit: 'ml' });
  }
  
  if (nameStr.includes('chicken') || catStr.includes('chicken')) {
    ingredients.push({ ingredient: 'Chicken', quantity: 150, unit: 'grams' });
  }

  if (nameStr.includes('egg') || catStr.includes('egg')) {
    ingredients.push({ ingredient: 'Eggs', quantity: 2, unit: 'pieces' });
  }

  if (nameStr.includes('paneer') || catStr.includes('paneer')) {
    ingredients.push({ ingredient: 'Paneer', quantity: 150, unit: 'grams' });
  }

  return {
    menuItemId: menuItem.id,
    tenantId: menuItem.tenantId || '',
    ingredients
  };
};
