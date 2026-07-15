import type { Request, Response } from 'express';
import { forwardGeocodeWithNominatim } from '../../backend-lib/location/forwardGeocode.js';

export async function handleLocationSearch(req: Request, res: Response): Promise<void> {
  try {
    const query = String(req.query.q ?? req.query.query ?? '');
    const limit = Number(req.query.limit ?? 5);
    const countryCodes = typeof req.query.countryCodes === 'string' ? req.query.countryCodes : 'in';

    const value = await forwardGeocodeWithNominatim({ query, limit, countryCodes });
    res.json({ ok: true, value });
  } catch (error: unknown) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    const message = error instanceof Error ? error.message : 'Forward geocode failed';
    const retryable = (error as { retryable?: boolean }).retryable ?? status >= 500;
    res.status(status).json({
      ok: false,
      error: { code: 'GEOCODE_UNAVAILABLE', message, retryable },
    });
  }
}
