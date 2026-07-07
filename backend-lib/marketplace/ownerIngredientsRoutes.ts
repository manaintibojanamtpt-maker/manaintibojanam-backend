import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';

type OwnerAccessFn = (
  userId: string,
  tenantId: string,
  email?: string,
) => Promise<string>;

const ALLOWED_UNITS = new Set([
  'kg',
  'gm',
  'litre',
  'ml',
  'pcs',
  'packet',
  'bottle',
  'dozen',
]);

function ingredientsRef(db: Firestore, tenantId: string) {
  return db.collection('tenants').doc(tenantId).collection('ingredients');
}

function normalizeIngredientPayload(body: Record<string, unknown>, partial = false) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!partial && !name) {
    const err: Error & { statusCode?: number } = new Error('Ingredient name is required');
    err.statusCode = 400;
    throw err;
  }

  const unit = typeof body.unit === 'string' ? body.unit.trim().toLowerCase() : 'gm';
  if (!ALLOWED_UNITS.has(unit)) {
    const err: Error & { statusCode?: number } = new Error(`Invalid unit: ${unit}`);
    err.statusCode = 400;
    throw err;
  }

  const currentStock = Number(body.currentStock ?? 0);
  const reorderLevel = Number(body.reorderLevel ?? 0);
  const costPerUnit = Number(body.costPerUnit ?? 0);
  const gstPercent = Number(body.gstPercent ?? 0);

  return {
    ...(name ? { name } : {}),
    category: typeof body.category === 'string' ? body.category.trim() : 'Other',
    unit,
    currentStock: Number.isFinite(currentStock) ? Math.max(0, currentStock) : 0,
    reorderLevel: Number.isFinite(reorderLevel) ? Math.max(0, reorderLevel) : 0,
    costPerUnit: Number.isFinite(costPerUnit) ? Math.max(0, costPerUnit) : 0,
    supplier: typeof body.supplier === 'string' ? body.supplier.trim() : '',
    brand: typeof body.brand === 'string' ? body.brand.trim() : '',
    gstPercent: Number.isFinite(gstPercent) ? Math.max(0, gstPercent) : 0,
    shelfLifeDays: Number.isFinite(Number(body.shelfLifeDays))
      ? Math.max(0, Number(body.shelfLifeDays))
      : 0,
    storageType: typeof body.storageType === 'string' ? body.storageType.trim() : 'dry',
    barcode: typeof body.barcode === 'string' ? body.barcode.trim() : '',
  };
}

export function registerOwnerIngredientsRoutes(
  app: Express,
  db: Firestore,
  verifyFirebaseToken: (req: Request, res: Response, next: () => void) => void,
  assertOwnerTenantAccess: OwnerAccessFn,
  fieldValue: typeof FieldValue,
): void {
  app.get('/api/owner/ingredients', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.query?.tenantId === 'string' ? req.query.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const snapshot = await ingredientsRef(db, resolvedTenantId).orderBy('name').get();
      const ingredients = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.json({ success: true, tenantId: resolvedTenantId, ingredients });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load ingredients',
      });
    }
  });

  app.post('/api/owner/ingredients', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const payload = normalizeIngredientPayload(req.body || {});

      const dup = await ingredientsRef(db, resolvedTenantId)
        .where('name', '==', payload.name)
        .limit(1)
        .get();
      if (!dup.empty) {
        return res.status(409).json({ success: false, error: 'Ingredient with this name already exists' });
      }

      const ref = ingredientsRef(db, resolvedTenantId).doc();
      await ref.set({
        ...payload,
        tenantId: resolvedTenantId,
        createdAt: fieldValue.serverTimestamp(),
        updatedAt: fieldValue.serverTimestamp(),
      });

      res.json({ success: true, id: ref.id, tenantId: resolvedTenantId, ingredient: { id: ref.id, ...payload } });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create ingredient',
      });
    }
  });

  app.put('/api/owner/ingredients/:id', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const ingredientId = typeof req.params?.id === 'string' ? req.params.id.trim() : '';
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      if (!ingredientId) {
        return res.status(400).json({ success: false, error: 'ingredient id is required' });
      }

      const ref = ingredientsRef(db, resolvedTenantId).doc(ingredientId);
      const existing = await ref.get();
      if (!existing.exists) {
        return res.status(404).json({ success: false, error: 'Ingredient not found' });
      }

      const payload = normalizeIngredientPayload(req.body || {}, true);
      if (payload.name) {
        const dup = await ingredientsRef(db, resolvedTenantId)
          .where('name', '==', payload.name)
          .limit(2)
          .get();
        const conflict = dup.docs.some((doc) => doc.id !== ingredientId);
        if (conflict) {
          return res.status(409).json({ success: false, error: 'Ingredient with this name already exists' });
        }
      }

      await ref.set(
        {
          ...payload,
          updatedAt: fieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      const updated = await ref.get();
      res.json({ success: true, id: ingredientId, ingredient: { id: updated.id, ...updated.data() } });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update ingredient',
      });
    }
  });

  app.delete('/api/owner/ingredients/:id', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const ingredientId = typeof req.params?.id === 'string' ? req.params.id.trim() : '';
      const tenantId = typeof req.query?.tenantId === 'string' ? req.query.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      if (!ingredientId) {
        return res.status(400).json({ success: false, error: 'ingredient id is required' });
      }

      const ref = ingredientsRef(db, resolvedTenantId).doc(ingredientId);
      const existing = await ref.get();
      if (!existing.exists) {
        return res.status(404).json({ success: false, error: 'Ingredient not found' });
      }

      await ref.delete();
      res.json({ success: true, id: ingredientId });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete ingredient',
      });
    }
  });
}
