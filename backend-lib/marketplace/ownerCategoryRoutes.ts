import type { Express, Request, Response } from 'express';
import type { FieldValue, Firestore } from 'firebase-admin/firestore';
import { publishTenantDomainEvent } from './tenantDomainEventBus.js';
import {
  normalizeOwnerCategoryPayload,
  parseOwnerCategoryDoc,
} from './ownerCategoryNormalization.js';

type OwnerAccessFn = (
  userId: string,
  tenantId: string,
  email?: string,
) => Promise<string>;

async function resolveTenantKeys(db: Firestore, tenantId: string): Promise<string[]> {
  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  const slug = tenantDoc.exists
    ? String((tenantDoc.data() as { slug?: string })?.slug ?? '').trim()
    : '';
  return slug && slug !== tenantId ? [tenantId, slug] : [tenantId];
}

export function registerOwnerCategoryRoutes(
  app: Express,
  db: Firestore,
  verifyFirebaseToken: (req: Request, res: Response, next: () => void) => void,
  assertOwnerTenantAccess: OwnerAccessFn,
  fieldValue: typeof FieldValue,
): void {
  app.get('/api/owner/menu/categories', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.query?.tenantId === 'string' ? req.query.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const tenantKeys = await resolveTenantKeys(db, resolvedTenantId);

      const seen = new Set<string>();
      const categories: Record<string, unknown>[] = [];
      for (const key of tenantKeys) {
        const snapshot = await db.collection('categories').where('tenantId', '==', key).get();
        for (const doc of snapshot.docs) {
          if (seen.has(doc.id)) continue;
          seen.add(doc.id);
          const parsed = parseOwnerCategoryDoc(doc.id, doc.data() as Record<string, unknown>);
          if (parsed) categories.push(parsed);
        }
      }

      categories.sort((a, b) => {
        const pa = typeof a.priority === 'number' ? a.priority : 0;
        const pb = typeof b.priority === 'number' ? b.priority : 0;
        if (pa !== pb) return pa - pb;
        return String(a.name ?? '').localeCompare(String(b.name ?? ''));
      });

      res.json({ success: true, tenantId: resolvedTenantId, categories });
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ success: false, error: err.message || 'Failed to load categories' });
    }
  });

  app.post('/api/owner/menu/categories', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const category = normalizeOwnerCategoryPayload(req.body || {}, resolvedTenantId);
      const ref = await db.collection('categories').add({
        ...category,
        createdAt: fieldValue.serverTimestamp(),
        updatedAt: fieldValue.serverTimestamp(),
      });
      await publishTenantDomainEvent(db, fieldValue, {
        tenantId: resolvedTenantId,
        type: 'MenuUpdated',
        source: 'owner_category_create',
      });
      res.json({ success: true, id: ref.id, category: { id: ref.id, ...category } });
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ success: false, error: err.message || 'Failed to create category' });
    }
  });

  app.put('/api/owner/menu/categories/:id', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const categoryId = typeof req.params?.id === 'string' ? req.params.id.trim() : '';
      if (!categoryId) {
        return res.status(400).json({ success: false, error: 'Category id is required' });
      }

      const existing = await db.collection('categories').doc(categoryId).get();
      if (!existing.exists) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }

      const existingData = existing.data() as Record<string, unknown>;
      const tenantId =
        (typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '') ||
        (typeof existingData.tenantId === 'string' ? existingData.tenantId : '');
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      const existingTenantId = typeof existingData.tenantId === 'string' ? existingData.tenantId : '';
      const tenantKeys = await resolveTenantKeys(db, resolvedTenantId);
      if (!tenantKeys.includes(existingTenantId)) {
        return res.status(403).json({ success: false, error: 'Unauthorized for this category' });
      }

      const category = normalizeOwnerCategoryPayload(
        { ...existingData, ...req.body },
        resolvedTenantId,
      );
      await db.collection('categories').doc(categoryId).set(
        { ...category, updatedAt: fieldValue.serverTimestamp() },
        { merge: true },
      );
      await publishTenantDomainEvent(db, fieldValue, {
        tenantId: resolvedTenantId,
        type: 'MenuUpdated',
        source: 'owner_category_update',
      });
      res.json({ success: true, id: categoryId, category: { id: categoryId, ...category } });
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ success: false, error: err.message || 'Failed to update category' });
    }
  });

  app.delete('/api/owner/menu/categories/:id', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const categoryId = typeof req.params?.id === 'string' ? req.params.id.trim() : '';
      if (!categoryId) {
        return res.status(400).json({ success: false, error: 'Category id is required' });
      }

      const existing = await db.collection('categories').doc(categoryId).get();
      if (!existing.exists) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }

      const existingData = existing.data() as Record<string, unknown>;
      const tenantId = typeof existingData.tenantId === 'string' ? existingData.tenantId : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const tenantKeys = await resolveTenantKeys(db, resolvedTenantId);
      if (!tenantKeys.includes(tenantId)) {
        return res.status(403).json({ success: false, error: 'Unauthorized for this category' });
      }

      await db.collection('categories').doc(categoryId).delete();
      await publishTenantDomainEvent(db, fieldValue, {
        tenantId: resolvedTenantId,
        type: 'MenuUpdated',
        source: 'owner_category_delete',
      });
      res.json({ success: true, id: categoryId });
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ success: false, error: err.message || 'Failed to delete category' });
    }
  });
}
