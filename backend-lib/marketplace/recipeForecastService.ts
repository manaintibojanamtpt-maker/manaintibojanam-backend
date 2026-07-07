import type { Firestore } from 'firebase-admin/firestore';

type ForecastLine = {
  ingredientId: string;
  name: string;
  unit: string;
  currentStock: number;
  forecastNeed: number;
  expectedBalance: number;
  shortage: number;
  recommendedPurchase: number;
};

export async function buildIngredientForecast(
  db: Firestore,
  tenantId: string,
  options?: { horizonDays?: number },
): Promise<{
  forecastDate: string;
  lines: ForecastLine[];
  alerts: Array<{ severity: 'low' | 'critical'; message: string; ingredientId: string }>;
  purchaseRecommendations: Array<{
    ingredientId: string;
    name: string;
    supplier: string;
    quantity: number;
    unit: string;
    estimatedCost: number;
    daysRemaining: number;
  }>;
}> {
  const horizonDays = options?.horizonDays ?? 1;
  const forecastDate = new Date();
  forecastDate.setDate(forecastDate.getDate() + horizonDays);
  const forecastDateIso = forecastDate.toISOString().slice(0, 10);

  const [ingredientsSnap, recipesSnap, ordersSnap] = await Promise.all([
    db.collection('tenants').doc(tenantId).collection('ingredients').get(),
    db.collection('recipes').where('tenantId', '==', tenantId).get(),
    db
      .collection('orders')
      .where('tenantId', '==', tenantId)
      .limit(200)
      .get(),
  ]);

  const recipeByMenuId = new Map<string, Array<{ ingredientId?: string; ingredient?: string; quantity: number; unit: string }>>();
  for (const doc of recipesSnap.docs) {
    const data = doc.data();
    if (!data.menuItemId || !Array.isArray(data.ingredients)) continue;
    recipeByMenuId.set(String(data.menuItemId), data.ingredients);
  }

  const salesByMenuItem = new Map<string, number>();
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  for (const doc of ordersSnap.docs) {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate?.() ? data.createdAt.toDate().getTime() : 0;
    if (createdAt && createdAt < cutoff) continue;
    const status = String(data.status || '').toUpperCase();
    if (['CANCELLED', 'EXPIRED', 'FAILED_DELIVERY'].includes(status)) continue;
    for (const item of data.items || []) {
      const menuItemId = String(item.menuItemId || item.id || '');
      const qty = Number(item.quantity ?? 1);
      if (!menuItemId || qty <= 0) continue;
      salesByMenuItem.set(menuItemId, (salesByMenuItem.get(menuItemId) || 0) + qty);
    }
  }

  const totalSales = [...salesByMenuItem.values()].reduce((sum, qty) => sum + qty, 0);
  const dailyVelocity = totalSales > 0 ? totalSales / 14 : 1;

  const forecastNeedByIngredient = new Map<string, number>();
  for (const [menuItemId, soldQty] of salesByMenuItem.entries()) {
    const recipe = recipeByMenuId.get(menuItemId);
    if (!recipe?.length) continue;
    const projectedOrders = (soldQty / 14) * horizonDays * 1.1;
    for (const row of recipe) {
      if (!row.quantity || row.quantity <= 0) continue;
      const key = row.ingredientId || row.ingredient?.trim().toLowerCase();
      if (!key) continue;
      forecastNeedByIngredient.set(key, (forecastNeedByIngredient.get(key) || 0) + row.quantity * projectedOrders);
    }
  }

  if (forecastNeedByIngredient.size === 0 && ingredientsSnap.size > 0) {
    for (const doc of ingredientsSnap.docs) {
      forecastNeedByIngredient.set(doc.id, dailyVelocity * 50);
    }
  }

  const lines: ForecastLine[] = [];
  const alerts: Array<{ severity: 'low' | 'critical'; message: string; ingredientId: string }> = [];
  const purchaseRecommendations: Array<{
    ingredientId: string;
    name: string;
    supplier: string;
    quantity: number;
    unit: string;
    estimatedCost: number;
    daysRemaining: number;
  }> = [];

  for (const doc of ingredientsSnap.docs) {
    const data = doc.data();
    const ingredientId = doc.id;
    const name = String(data.name || 'Ingredient');
    const unit = String(data.unit || 'gm');
    const currentStock = Number(data.currentStock ?? 0);
    const reorderLevel = Number(data.reorderLevel ?? 0);
    const costPerUnit = Number(data.costPerUnit ?? 0);
    const supplier = String(data.supplier || 'Primary supplier');

    const forecastNeed = Math.round((forecastNeedByIngredient.get(ingredientId) || dailyVelocity * 25) * 100) / 100;
    const expectedBalance = Math.round((currentStock - forecastNeed) * 100) / 100;
    const shortage = Math.max(0, Math.round((forecastNeed - currentStock) * 100) / 100);
    const recommendedPurchase = Math.max(shortage, reorderLevel > currentStock ? reorderLevel - currentStock : 0);

    lines.push({
      ingredientId,
      name,
      unit,
      currentStock,
      forecastNeed,
      expectedBalance,
      shortage,
      recommendedPurchase,
    });

    if (shortage > 0) {
      alerts.push({
        severity: shortage > reorderLevel ? 'critical' : 'low',
        message: `${name} shortage estimated at ${shortage} ${unit}`,
        ingredientId,
      });
      purchaseRecommendations.push({
        ingredientId,
        name,
        supplier,
        quantity: Math.ceil(recommendedPurchase),
        unit,
        estimatedCost: Math.round(Math.ceil(recommendedPurchase) * costPerUnit * 100) / 100,
        daysRemaining: forecastNeed > 0 ? Math.max(0, Math.floor((currentStock / forecastNeed) * horizonDays)) : 99,
      });
    }
  }

  return { forecastDate: forecastDateIso, lines, alerts, purchaseRecommendations };
}
