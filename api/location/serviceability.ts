import type { Request, Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { loadTenantBySlug } from '../../backend-lib/marketplace/marketplaceTenantLoader.js';
import {
  checkLocationServiceability,
  toMarketplaceServiceabilityResult,
} from '../../backend-lib/location/serviceability.js';

export async function handleLocationServiceability(
  req: Request,
  res: Response,
  db?: Firestore,
): Promise<void> {
  try {
    const body = (req.body ?? {}) as {
      lat: number;
      lng: number;
      restaurantId?: string;
      kitchenId?: string;
      kitchenLat?: number;
      kitchenLng?: number;
      deliveryConfig?: {
        freeRadius?: number;
        paidRadius?: number;
        maxRadius?: number;
        baseFee?: number;
        perKmCharge?: number;
      };
    };

    let kitchenId = body.kitchenId || body.restaurantId;
    let kitchenLat = body.kitchenLat;
    let kitchenLng = body.kitchenLng;
    let deliveryConfig = body.deliveryConfig;

    if (body.restaurantId && db) {
      const loaded = await loadTenantBySlug(db, body.restaurantId);
      if (!loaded) {
        res.status(404).json({
          ok: false,
          error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant not found' },
        });
        return;
      }
      kitchenId = loaded.tenant.slug;
      if (loaded.tenant.location) {
        kitchenLat = loaded.tenant.location.lat;
        kitchenLng = loaded.tenant.location.lng;
      }
      deliveryConfig = (loaded.raw.deliveryConfig ?? {}) as typeof deliveryConfig;
    }

    const prepTime = Number(deliveryConfig?.prepTime ?? 25);

    const serviceability = checkLocationServiceability({
      lat: Number(body.lat),
      lng: Number(body.lng),
      kitchenId,
      kitchenLat,
      kitchenLng,
      deliveryConfig,
    });

    res.json({
      ok: true,
      value: {
        ...toMarketplaceServiceabilityResult(serviceability, prepTime),
        serviceability,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Serviceability check failed';
    res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
  }
}
