import type { Request, Response } from 'express';
import { reverseGeocode } from '../../backend-lib/location/reverseGeocode.js';

export async function handleLocationReverse(req: Request, res: Response): Promise<void> {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const language = typeof req.query.language === 'string' ? req.query.language : undefined;

    const value = await reverseGeocode({ lat, lng, language });
    res.json({ ok: true, value });
  } catch (error: unknown) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    const message = error instanceof Error ? error.message : 'Reverse geocode failed';
    const retryable = (error as { retryable?: boolean }).retryable ?? status >= 500;
    res.status(status).json({
      ok: false,
      error: { code: 'GEOCODE_UNAVAILABLE', message, retryable },
    });
  }
}
