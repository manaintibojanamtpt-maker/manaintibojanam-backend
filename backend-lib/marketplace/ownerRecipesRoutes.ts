import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import { computeRecipeCost } from './recipeCostEngine.js';
import { buildRecipeIntelligenceSummary, deductInventoryForOrder } from './recipeConsumptionService.js';
import { buildIngredientForecast } from './recipeForecastService.js';
import { queryMenuForTenant } from './menuTenantQuery.js';
import {
  suggestCostOptimizations,
  suggestRecipeFromDishName,
} from './recipeSuggestService.js';

type OwnerAccessFn = (
  userId: string,
  tenantId: string,
  email?: string,
) => Promise<string>;

const ALLOWED_UNITS = new Set([
  'kg',
  'gm',
  'grams',
  'g',
  'litre',
  'l',
  'ml',
  'pcs',
  'pieces',
  'packet',
  'bottle',
  'dozen',
]);

type RecipeIngredient = {
  ingredientId?: string;
  ingredient?: string;
  quantity: number;
  unit: string;
};

function normalizeUnit(unit: string): string {
  const value = unit.trim().toLowerCase();
  if (value === 'grams' || value === 'g') return 'gm';
  if (value === 'l') return 'litre';
  if (value === 'pieces') return 'pcs';
  return value;
}

function normalizeIngredients(raw: unknown): RecipeIngredient[] {
  if (!Array.isArray(raw)) return [];

  const rows: RecipeIngredient[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const ingredientId = typeof row.ingredientId === 'string' ? row.ingredientId.trim() : '';
    const ingredient = typeof row.ingredient === 'string' ? row.ingredient.trim() : '';
    const quantity = Number(row.quantity);
    const unit = normalizeUnit(typeof row.unit === 'string' ? row.unit : 'gm');

    if (!ingredientId && !ingredient) continue;
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    if (!ALLOWED_UNITS.has(unit)) continue;

    const dedupeKey = ingredientId || ingredient.toLowerCase();
    if (seen.has(dedupeKey)) {
      const err: Error & { statusCode?: number } = new Error('Duplicate ingredient in recipe');
      err.statusCode = 400;
      throw err;
    }
    seen.add(dedupeKey);

    rows.push({
      ...(ingredientId ? { ingredientId } : {}),
      ...(ingredient ? { ingredient } : {}),
      quantity,
      unit,
    });
  }

  return rows;
}

async function loadMasterById(db: Firestore, tenantId: string) {
  const snapshot = await db.collection('tenants').doc(tenantId).collection('ingredients').get();
  return new Map(
    snapshot.docs.map((doc) => {
      const data = doc.data();
      return [
        doc.id,
        {
          id: doc.id,
          name: String(data.name || ''),
          unit: String(data.unit || 'gm'),
          costPerUnit: Number(data.costPerUnit ?? 0),
          gstPercent: Number(data.gstPercent ?? 0),
        },
      ];
    }),
  );
}

export function registerOwnerRecipesRoutes(
  app: Express,
  db: Firestore,
  verifyFirebaseToken: (req: Request, res: Response, next: () => void) => void,
  assertOwnerTenantAccess: OwnerAccessFn,
  fieldValue: typeof FieldValue,
): void {
  app.get('/api/owner/recipes', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.query?.tenantId === 'string' ? req.query.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      const snapshot = await db.collection('recipes').where('tenantId', '==', resolvedTenantId).get();
      const recipes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      res.json({ success: true, tenantId: resolvedTenantId, recipes });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load recipes',
      });
    }
  });

  app.get('/api/owner/recipes/intelligence/summary', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.query?.tenantId === 'string' ? req.query.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      const tenantDoc = await db.collection('tenants').doc(resolvedTenantId).get();
      const tenantSlug = tenantDoc.exists ? String(tenantDoc.data()?.slug || '') : '';
      const menuSnap = await queryMenuForTenant(db, resolvedTenantId, tenantSlug);
      const menuItems = menuSnap.docs.map((doc) => ({
        id: doc.id,
        name: String(doc.data().name || ''),
        price: Number(doc.data().price ?? 0),
      }));

      const summary = await buildRecipeIntelligenceSummary(db, resolvedTenantId, menuItems);
      res.json({ success: true, tenantId: resolvedTenantId, summary });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load recipe summary',
      });
    }
  });

  app.get('/api/owner/recipes/intelligence/forecast', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.query?.tenantId === 'string' ? req.query.tenantId.trim() : '';
      const horizonDays = Number(req.query?.horizonDays ?? 1);
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      const forecast = await buildIngredientForecast(db, resolvedTenantId, {
        horizonDays: Number.isFinite(horizonDays) ? horizonDays : 1,
      });
      res.json({ success: true, tenantId: resolvedTenantId, forecast });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load forecast',
      });
    }
  });

  app.post('/api/owner/recipes/suggest', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const dishName = typeof req.body?.dishName === 'string' ? req.body.dishName.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      if (!dishName) {
        return res.status(400).json({ success: false, error: 'dishName is required' });
      }

      const suggestions = suggestRecipeFromDishName(dishName);
      const masterSnap = await db.collection('tenants').doc(resolvedTenantId).collection('ingredients').get();
      const byName = new Map(
        masterSnap.docs.map((doc) => [String(doc.data().name || '').trim().toLowerCase(), doc.id]),
      );

      const ingredients = suggestions.map((row) => ({
        ingredientId: byName.get(row.name.toLowerCase()) || undefined,
        ingredient: row.name,
        quantity: row.quantity,
        unit: row.unit,
      }));

      res.json({ success: true, tenantId: resolvedTenantId, dishName, ingredients });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to suggest recipe',
      });
    }
  });

  app.post('/api/owner/recipes/:menuItemId/cost', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const menuItemId = typeof req.params?.menuItemId === 'string' ? req.params.menuItemId.trim() : '';
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      const ingredients = normalizeIngredients(req.body?.ingredients);
      const sellingPrice = Number(req.body?.sellingPrice ?? 0);
      const masterById = await loadMasterById(db, resolvedTenantId);
      const cost = computeRecipeCost(ingredients, masterById, { sellingPrice });
      const optimizations = suggestCostOptimizations(
        cost.lines.map((line) => ({
          name: line.name,
          quantity: line.quantity,
          unit: line.unit,
          lineCost: line.lineCost,
        })),
      );

      res.json({ success: true, tenantId: resolvedTenantId, menuItemId, cost, optimizations });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compute recipe cost',
      });
    }
  });

  app.put('/api/owner/recipes/:menuItemId', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const menuItemId = typeof req.params?.menuItemId === 'string' ? req.params.menuItemId.trim() : '';
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      if (!menuItemId) {
        return res.status(400).json({ success: false, error: 'menuItemId is required' });
      }

      const ingredients = normalizeIngredients(req.body?.ingredients);
      if (ingredients.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one ingredient is required' });
      }

      const recipeId = `${resolvedTenantId}_${menuItemId}`;

      await db.collection('recipes').doc(recipeId).set(
        {
          menuItemId,
          tenantId: resolvedTenantId,
          ingredients,
          updatedAt: fieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      res.json({ success: true, tenantId: resolvedTenantId, id: recipeId, menuItemId, ingredients });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save recipe',
      });
    }
  });

  app.delete('/api/owner/recipes/:menuItemId', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const menuItemId = typeof req.params?.menuItemId === 'string' ? req.params.menuItemId.trim() : '';
      const tenantId = typeof req.query?.tenantId === 'string' ? req.query.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      if (!menuItemId) {
        return res.status(400).json({ success: false, error: 'menuItemId is required' });
      }

      const recipeId = `${resolvedTenantId}_${menuItemId}`;
      const ref = db.collection('recipes').doc(recipeId);
      const existing = await ref.get();
      if (!existing.exists) {
        return res.status(404).json({ success: false, error: 'Recipe not found' });
      }

      await ref.delete();
      res.json({ success: true, id: recipeId, menuItemId });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete recipe',
      });
    }
  });
}

export async function maybeDeductInventoryOnOrderStatus(
  db: Firestore,
  fieldValue: typeof FieldValue,
  orderId: string,
  orderData: Record<string, unknown>,
  newStatus: string,
): Promise<void> {
  const deductStatuses = new Set(['ACCEPTED', 'CONFIRMED', 'PREPARING']);
  if (!deductStatuses.has(String(newStatus).toUpperCase())) return;
  if (orderData.inventoryDeducted === true) return;

  const tenantId = String(orderData.tenantId || '');
  const items = Array.isArray(orderData.items) ? orderData.items : [];
  if (!tenantId || items.length === 0) return;

  const recipesSnap = await db.collection('recipes').where('tenantId', '==', tenantId).get();
  const recipeRows = recipesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      menuItemId: String(data.menuItemId || ''),
      ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
    };
  });

  await deductInventoryForOrder(db, fieldValue, tenantId, items, recipeRows);
  await db.collection('orders').doc(orderId).update({
    inventoryDeducted: true,
    inventoryDeductedAt: fieldValue.serverTimestamp(),
  });
}
