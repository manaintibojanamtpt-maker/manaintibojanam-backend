import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import { loadTenantBySlug } from './marketplaceTenantLoader.js';
import { projectRestaurantPublic } from './projectDiscovery.js';
import { validateMarketplaceCart } from './projectCartValidation.js';
import type { MarketplaceQuoteRequest } from './projectCheckout.js';

type VerifyTokenFn = (req: Request, res: Response, next: () => void) => void;

function customerRef(db: Firestore, uid: string) {
  return db.collection('customers').doc(uid);
}

async function loadFavoriteRestaurants(db: Firestore, ids: readonly string[]) {
  const favorites = [];
  for (const id of ids) {
    const loaded = await loadTenantBySlug(db, id);
    if (!loaded) continue;
    const coords = loaded.tenant.location
      ? { lat: loaded.tenant.location.lat, lng: loaded.tenant.location.lng }
      : { lat: 0, lng: 0 };
    favorites.push(projectRestaurantPublic(loaded.tenant, loaded.raw, coords));
  }
  return favorites;
}

export function registerMarketplaceCustomerRoutes(
  app: Express,
  db: Firestore,
  fieldValue: typeof FieldValue,
  verifyFirebaseToken?: VerifyTokenFn,
): void {
  const prefix = '/api/marketplace';

  app.post(`${prefix}/cart/validate`, async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as MarketplaceQuoteRequest;
      const result = await validateMarketplaceCart(db, body);
      res.json({ ok: true, value: result });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      const message = error instanceof Error ? error.message : 'Cart validation failed';
      res.status(status).json({ ok: false, error: { code: 'CART_INVALID', message, retryable: status >= 500 } });
    }
  });

  if (!verifyFirebaseToken) return;

  app.get(`${prefix}/profile`, verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const snap = await customerRef(db, req.user.uid).get();
      const data = snap.exists ? (snap.data() as Record<string, unknown>) : {};
      res.json({
        ok: true,
        value: {
          uid: req.user.uid,
          displayName: data.displayName ?? req.user.name ?? null,
          email: data.email ?? req.user.email ?? null,
          phone: data.phoneNumber ?? data.phone ?? null,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load profile';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.patch(`${prefix}/profile`, verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const patch: Record<string, unknown> = { updatedAt: fieldValue.serverTimestamp() };
      if (typeof req.body?.displayName === 'string') patch.displayName = req.body.displayName.trim();
      if (typeof req.body?.phone === 'string') patch.phoneNumber = req.body.phone.trim();
      if (typeof req.body?.email === 'string') patch.email = req.body.email.trim().toLowerCase();
      await customerRef(db, req.user.uid).set({ uid: req.user.uid, ...patch }, { merge: true });
      const snap = await customerRef(db, req.user.uid).get();
      const data = snap.data() as Record<string, unknown>;
      res.json({
        ok: true,
        value: {
          uid: req.user.uid,
          displayName: data.displayName ?? null,
          email: data.email ?? null,
          phone: data.phoneNumber ?? null,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.get(`${prefix}/favorites`, verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const snap = await customerRef(db, req.user.uid).get();
      const ids = (snap.data()?.favoriteRestaurantIds ?? []) as string[];
      const favorites = await loadFavoriteRestaurants(db, ids);
      res.json({ ok: true, value: { favorites } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load favorites';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.post(`${prefix}/favorites`, verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const restaurantId = typeof req.body?.restaurantId === 'string' ? req.body.restaurantId.trim() : '';
      if (!restaurantId) {
        return res.status(400).json({ ok: false, error: { code: 'INVALID', message: 'restaurantId is required' } });
      }
      const ref = customerRef(db, req.user.uid);
      await ref.set(
        {
          uid: req.user.uid,
          favoriteRestaurantIds: fieldValue.arrayUnion(restaurantId),
          updatedAt: fieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      const snap = await ref.get();
      const ids = (snap.data()?.favoriteRestaurantIds ?? []) as string[];
      const favorites = await loadFavoriteRestaurants(db, ids);
      res.json({ ok: true, value: { favorites } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add favorite';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.delete(`${prefix}/favorites/:restaurantId`, verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const restaurantId = String(req.params.restaurantId ?? '').trim();
      const ref = customerRef(db, req.user.uid);
      await ref.set(
        {
          favoriteRestaurantIds: fieldValue.arrayRemove(restaurantId),
          updatedAt: fieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      const snap = await ref.get();
      const ids = (snap.data()?.favoriteRestaurantIds ?? []) as string[];
      const favorites = await loadFavoriteRestaurants(db, ids);
      res.json({ ok: true, value: { favorites } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove favorite';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.post(`${prefix}/notifications/register`, verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
      const platform = typeof req.body?.platform === 'string' ? req.body.platform : 'web';
      if (!token) {
        return res.status(400).json({ ok: false, error: { code: 'INVALID', message: 'token is required' } });
      }
      await customerRef(db, req.user.uid).set(
        {
          notificationTokens: fieldValue.arrayUnion({ token, platform, registeredAt: new Date().toISOString() }),
          updatedAt: fieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      res.json({ ok: true, value: { registered: true } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to register notification token';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });
}
