import { ownerApiRequest } from './ownerProvisioning';
import type {
  Recipe,
  RecipeIngredient,
  RecipeCostResult,
  RecipeIntelligenceSummary,
  IngredientForecast,
} from '../types';

export async function fetchOwnerRecipes(tenantId: string) {
  return ownerApiRequest<{ success: boolean; tenantId: string; recipes: Recipe[] }>(
    'GET',
    `/api/owner/recipes?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function saveOwnerRecipe(
  tenantId: string,
  menuItemId: string,
  ingredients: RecipeIngredient[],
) {
  return ownerApiRequest<{
    success: boolean;
    tenantId: string;
    id: string;
    menuItemId: string;
    ingredients: RecipeIngredient[];
  }>('PUT', `/api/owner/recipes/${encodeURIComponent(menuItemId)}`, { tenantId, ingredients });
}

export async function deleteOwnerRecipe(tenantId: string, menuItemId: string) {
  return ownerApiRequest<{ success: boolean; id: string; menuItemId: string }>(
    'DELETE',
    `/api/owner/recipes/${encodeURIComponent(menuItemId)}?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function fetchRecipeIntelligenceSummary(tenantId: string) {
  return ownerApiRequest<{ success: boolean; summary: RecipeIntelligenceSummary }>(
    'GET',
    `/api/owner/recipes/intelligence/summary?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function fetchIngredientForecast(tenantId: string, horizonDays = 1) {
  return ownerApiRequest<{ success: boolean; forecast: IngredientForecast }>(
    'GET',
    `/api/owner/recipes/intelligence/forecast?tenantId=${encodeURIComponent(tenantId)}&horizonDays=${horizonDays}`,
  );
}

export async function suggestOwnerRecipe(tenantId: string, dishName: string) {
  return ownerApiRequest<{
    success: boolean;
    dishName: string;
    ingredients: RecipeIngredient[];
  }>('POST', '/api/owner/recipes/suggest', { tenantId, dishName });
}

export async function computeOwnerRecipeCost(
  tenantId: string,
  menuItemId: string,
  ingredients: RecipeIngredient[],
  sellingPrice: number,
) {
  return ownerApiRequest<{
    success: boolean;
    cost: RecipeCostResult;
    optimizations: string[];
  }>('POST', `/api/owner/recipes/${encodeURIComponent(menuItemId)}/cost`, {
    tenantId,
    ingredients,
    sellingPrice,
  });
}
