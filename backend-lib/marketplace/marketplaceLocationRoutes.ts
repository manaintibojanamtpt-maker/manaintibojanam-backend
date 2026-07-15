import type { Express, Request, Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { reverseGeocode } from '../location/reverseGeocode.js';
import {
  checkLocationServiceability,
  toMarketplaceServiceabilityResult,
} from '../location/serviceability.js';
import { loadTenantBySlug } from './marketplaceTenantLoader.js';
import {
  checkMarketplaceDeliveryZone,
  computeMarketplaceDistance,
  validateMarketplacePincode,
} from './projectLocation.js';

export function registerMarketplaceLocationRoutes(app: Express, db: Firestore): void {
  const prefix = '/api/marketplace/location';

  app.get(`${prefix}/reverse`, async (req: Request, res: Response) => {
    try {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const language = typeof req.query.language === 'string' ? req.query.language : undefined;
      const result = await reverseGeocode({ lat, lng, language });
      res.json({
        ok: true,
        value: {
          displayLabel: result.displayLabel,
          hints: {
            cityName: result.text.city,
            areaName: result.text.area,
            pincode: result.text.pincode,
            stateName: result.text.state,
          },
          confidence: result.meta.precision === 'exact' ? 'high' : result.meta.precision === 'nearby' ? 'medium' : 'low',
          text: result.text,
          meta: result.meta,
        },
      });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      const message = error instanceof Error ? error.message : 'Reverse geocode failed';
      res.status(status).json({ ok: false, error: { code: 'GEOCODE_UNAVAILABLE', message, retryable: status >= 500 } });
    }
  });

  app.get(`${prefix}/validate-pincode`, (req: Request, res: Response) => {
    const pincode = String(req.query.pincode ?? '');
    const stateCode = typeof req.query.stateCode === 'string' ? req.query.stateCode : undefined;
    res.json({ ok: true, value: validateMarketplacePincode(pincode, stateCode) });
  });

  app.post(`${prefix}/serviceability`, async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as {
        lat: number;
        lng: number;
        restaurantId?: string;
        orderType?: 'delivery' | 'pickup';
      };

      let restaurantCoords: { lat: number; lng: number } | undefined;
      let deliveryConfig: {
        freeRadius?: number;
        paidRadius?: number;
        maxRadius?: number;
        baseFee?: number;
        perKmCharge?: number;
      } | undefined;
      if (body.restaurantId) {
        const loaded = await loadTenantBySlug(db, body.restaurantId);
        if (!loaded) {
          return res.status(404).json({ ok: false, error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant not found' } });
        }
        if (loaded.tenant.location) {
          restaurantCoords = { lat: loaded.tenant.location.lat, lng: loaded.tenant.location.lng };
        }
        deliveryConfig = (loaded.raw.deliveryConfig ?? {}) as typeof deliveryConfig;
      }

      const serviceability = checkLocationServiceability({
        lat: Number(body.lat),
        lng: Number(body.lng),
        kitchenId: body.restaurantId,
        kitchenLat: restaurantCoords?.lat,
        kitchenLng: restaurantCoords?.lng,
        deliveryConfig,
      });
      const value = toMarketplaceServiceabilityResult(serviceability);
      res.json({ ok: true, value });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Serviceability check failed';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.post(`${prefix}/delivery-zone`, (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { lat: number; lng: number; maxRadiusKm?: number };
    res.json({ ok: true, value: checkMarketplaceDeliveryZone(body) });
  });

  app.post(`${prefix}/distance`, (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as {
        origin: { lat: number; lng: number };
        destination: { lat: number; lng: number };
      };
      res.json({ ok: true, value: computeMarketplaceDistance(body) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Distance calculation failed';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });
}
