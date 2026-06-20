import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { Recipe, RecipeIngredient, MenuItem } from '../types';

export const getRecipes = async (tenantId: string): Promise<Recipe[]> => {
  if (!tenantId) return [];
  try {
    const q = query(collection(getDb(), 'recipes'), where('tenantId', '==', tenantId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
  } catch (err) {
    console.error('Error fetching recipes:', err);
    return [];
  }
};

export const saveRecipe = async (tenantId: string, menuItemId: string, ingredients: RecipeIngredient[]): Promise<boolean> => {
  if (!tenantId || !menuItemId) return false;
  try {
    // We use menuItemId as the document ID for the recipe to ensure 1:1 mapping
    const recipeRef = doc(getDb(), 'recipes', `${tenantId}_${menuItemId}`);
    
    const recipe: Recipe = {
      menuItemId,
      tenantId,
      ingredients,
    };
    
    await setDoc(recipeRef, recipe, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving recipe:', err);
    return false;
  }
};

export const getRecipeForMenuItem = async (tenantId: string, menuItemId: string): Promise<Recipe | null> => {
  if (!tenantId || !menuItemId) return null;
  try {
    const recipeRef = doc(getDb(), 'recipes', `${tenantId}_${menuItemId}`);
    const snapshot = await getDoc(recipeRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Recipe;
    }
    return null;
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
