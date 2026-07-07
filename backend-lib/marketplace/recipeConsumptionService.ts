import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import { computeRecipeCost, type RecipeIngredientRow } from './recipeCostEngine.js';

type RecipeIngredient = RecipeIngredientRow & {
  ingredient?: string;
};

const UNIT_TO_BASE: Record<string, { family: string; factor: number }> = {
  kg: { family: 'mass', factor: 1000 },
  gm: { family: 'mass', factor: 1 },
  grams: { family: 'mass', factor: 1 },
  g: { family: 'mass', factor: 1 },
  litre: { family: 'volume', factor: 1000 },
  l: { family: 'volume', factor: 1000 },
  ml: { family: 'volume', factor: 1 },
  pcs: { family: 'count', factor: 1 },
  pieces: { family: 'count', factor: 1 },
  packet: { family: 'count', factor: 1 },
  bottle: { family: 'count', factor: 1 },
  dozen: { family: 'count', factor: 12 },
};

function convertQuantity(quantity: number, fromUnit: string, toUnit: string): number {
  const from = UNIT_TO_BASE[fromUnit.trim().toLowerCase()];
  const to = UNIT_TO_BASE[toUnit.trim().toLowerCase()];
  if (!from || !to || from.family !== to.family) return quantity;
  return (quantity * from.factor) / to.factor;
}

export async function deductInventoryForOrder(
  db: Firestore,
  fieldValue: typeof FieldValue,
  tenantId: string,
  orderItems: Array<{ menuItemId?: string; quantity?: number; name?: string }>,
  recipeRows: Array<{ menuItemId: string; ingredients: RecipeIngredient[] }>,
): Promise<{ deducted: number; warnings: string[] }> {
  const warnings: string[] = [];
  let deducted = 0;

  const recipeByMenuId = new Map(recipeRows.map((row) => [row.menuItemId, row.ingredients]));
  if (recipeByMenuId.size === 0) {
    return { deducted: 0, warnings: ['No recipes configured for inventory deduction'] };
  }

  const ingredientsSnap = await db.collection('tenants').doc(tenantId).collection('ingredients').get();
  const ingredientDocs = new Map(ingredientsSnap.docs.map((doc) => [doc.id, doc]));

  const usageByIngredient = new Map<string, { qty: number; unit: string }>();

  for (const line of orderItems) {
    const menuItemId = line.menuItemId;
    const orderQty = Number(line.quantity ?? 1);
    if (!menuItemId || !Number.isFinite(orderQty) || orderQty <= 0) continue;

    const recipe = recipeByMenuId.get(menuItemId);
    if (!recipe?.length) {
      warnings.push(`Recipe missing for ${line.name || menuItemId}`);
      continue;
    }

    for (const row of recipe) {
      if (!row.quantity || row.quantity <= 0) continue;
      const key = row.ingredientId || row.ingredient?.trim().toLowerCase();
      if (!key) continue;
      const prev = usageByIngredient.get(key);
      const totalQty = row.quantity * orderQty;
      usageByIngredient.set(key, {
        qty: (prev?.qty || 0) + totalQty,
        unit: row.unit,
      });
    }
  }

  const batch = db.batch();
  for (const [key, usage] of usageByIngredient.entries()) {
    let doc = ingredientDocs.get(key);
    if (!doc) {
      doc = [...ingredientDocs.values()].find(
        (candidate) => String(candidate.data()?.name || '').trim().toLowerCase() === key,
      );
    }
    if (!doc) {
      warnings.push(`Ingredient not found for ${key}`);
      continue;
    }

    const data = doc.data();
    const stockUnit = String(data.unit || 'gm');
    const currentStock = Number(data.currentStock ?? 0);
    const convertedUse = convertQuantity(usage.qty, usage.unit, stockUnit);
    const nextStock = Math.max(0, currentStock - convertedUse);

    batch.update(doc.ref, {
      currentStock: nextStock,
      updatedAt: fieldValue.serverTimestamp(),
    });
    deducted += 1;
  }

  if (deducted > 0) {
    await batch.commit();
  }

  return { deducted, warnings };
}

export async function buildRecipeIntelligenceSummary(
  db: Firestore,
  tenantId: string,
  menuItems: Array<{ id: string; name: string; price?: number }>,
) {
  const [recipesSnap, ingredientsSnap] = await Promise.all([
    db.collection('recipes').where('tenantId', '==', tenantId).get(),
    db.collection('tenants').doc(tenantId).collection('ingredients').get(),
  ]);

  const recipes = recipesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const ingredients = ingredientsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const masterById = new Map(
    ingredients.map((row) => [
      row.id,
      {
        id: row.id,
        name: String(row.name || ''),
        unit: String(row.unit || 'gm'),
        costPerUnit: Number(row.costPerUnit ?? 0),
        gstPercent: Number(row.gstPercent ?? 0),
      },
    ]),
  );

  const configuredMenuIds = new Set(
    recipes
      .filter((recipe) => Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0)
      .map((recipe) => String(recipe.menuItemId || '')),
  );

  const costs = menuItems
    .map((item) => {
      const recipe = recipes.find((row) => row.menuItemId === item.id);
      if (!recipe || !Array.isArray(recipe.ingredients)) return null;
      return computeRecipeCost(recipe.ingredients, masterById, {
        sellingPrice: Number(item.price ?? 0),
      });
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const recipeCoveragePercent =
    menuItems.length > 0 ? Math.round((configuredMenuIds.size / menuItems.length) * 100) : 0;

  const averageRecipeCost =
    costs.length > 0
      ? Math.round((costs.reduce((sum, row) => sum + row.totalCost, 0) / costs.length) * 100) / 100
      : 0;

  const sortedByCost = [...costs].sort((a, b) => b.totalCost - a.totalCost);
  const sortedByMargin = [...costs].sort((a, b) => a.marginPercent - b.marginPercent);

  return {
    recipeCoveragePercent,
    totalIngredients: ingredients.length,
    averageRecipeCost,
    mostExpensiveCost: sortedByCost[0]?.totalCost ?? 0,
    highestMarginPercent: sortedByMargin[sortedByMargin.length - 1]?.marginPercent ?? 0,
    lowestMarginPercent: sortedByMargin[0]?.marginPercent ?? 0,
    configuredCount: configuredMenuIds.size,
    menuCount: menuItems.length,
  };
}
