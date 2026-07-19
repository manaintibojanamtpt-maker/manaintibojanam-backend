import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import {
  readPlatformHomeHeroConfig,
  writePlatformHomeHeroConfig,
} from './platformHomeHeroConfig.js';

type RequireSuperadminFn = (req: Request, res: Response, next: () => void) => void | Promise<void>;

export function registerPlatformHomeHeroRoutes(
  app: Express,
  db: Firestore,
  requireSuperadmin: RequireSuperadminFn,
  fieldValue: typeof FieldValue,
): void {
  app.get('/api/platform/orderbhojan-home-hero', requireSuperadmin, async (_req: Request, res: Response) => {
    try {
      const config = await readPlatformHomeHeroConfig(db);
      res.json({ success: true, data: config });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load home hero config',
      });
    }
  });

  app.put('/api/platform/orderbhojan-home-hero', requireSuperadmin, async (req: any, res: Response) => {
    try {
      const actorEmail = String(req.user?.email || 'superadmin').toLowerCase();
      const config = await writePlatformHomeHeroConfig(db, req.body, actorEmail, fieldValue);
      res.json({ success: true, data: config });
    } catch (error: unknown) {
      const status = error instanceof Error && /requires|must be|allowed|No more than/i.test(error.message) ? 400 : 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update home hero config',
      });
    }
  });
}
