import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import bodyParser from 'body-parser';
import {
  buildStorefrontMediaPublicUrl,
  loadStorefrontMedia,
  MAX_STOREFRONT_MEDIA_BYTES,
  saveStorefrontMedia,
  type StorefrontMediaKind,
} from './storefrontMediaStorage.js';

type OwnerAccessFn = (
  userId: string,
  tenantId: string,
  email?: string,
) => Promise<string>;

function resolveApiOrigin(req: Request): string {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0] : 'https';
  const forwardedHost = req.headers['x-forwarded-host'];
  const host =
    (typeof forwardedHost === 'string' ? forwardedHost.split(',')[0] : null) ||
    req.headers.host ||
    process.env.PUBLIC_API_ORIGIN ||
    'https://manaintibojanam-backend.onrender.com';
  return `${proto}://${host}`;
}

/** Register before global JSON parser — same pattern as KYC inline upload (no Firebase Storage). */
export function registerOwnerStorefrontMediaRoutes(
  app: Express,
  db: Firestore,
  verifyFirebaseToken: (req: Request, res: Response, next: () => void) => void,
  assertOwnerTenantAccess: OwnerAccessFn,
  fieldValue: typeof FieldValue,
): void {
  app.post(
    '/api/owner/storefront/:tenantId/media',
    verifyFirebaseToken,
    bodyParser.json({ limit: '2mb' }),
    async (req: any, res: Response) => {
      try {
        const tenantId = String(req.params.tenantId);
        await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

        const kind = req.body?.kind as StorefrontMediaKind;
        const fileBase64 = typeof req.body?.fileBase64 === 'string' ? req.body.fileBase64 : '';
        const contentType =
          typeof req.body?.contentType === 'string' ? req.body.contentType : 'image/jpeg';

        if (!kind || !['cover', 'gallery', 'logo'].includes(kind)) {
          return res.status(400).json({ success: false, error: 'Invalid media kind.' });
        }
        if (!fileBase64) {
          return res.status(400).json({ success: false, error: 'Missing image data.' });
        }

        let buffer: Buffer;
        try {
          buffer = Buffer.from(fileBase64, 'base64');
        } catch {
          return res.status(400).json({ success: false, error: 'Invalid image encoding.' });
        }

        if (buffer.length <= 0 || buffer.length > MAX_STOREFRONT_MEDIA_BYTES) {
          return res.status(400).json({
            success: false,
            error: `Image must be ${Math.round(MAX_STOREFRONT_MEDIA_BYTES / 1024)}KB or smaller after compression.`,
          });
        }

        const saved = await saveStorefrontMedia(db, fieldValue, {
          tenantId,
          kind,
          contentType,
          buffer,
          uploadedBy: req.user.uid,
        });

        const url = buildStorefrontMediaPublicUrl(resolveApiOrigin(req), tenantId, saved.mediaId);
        res.json({
          success: true,
          tenantId,
          mediaId: saved.mediaId,
          url,
          fileSize: saved.fileSize,
        });
      } catch (error: unknown) {
        const status = (error as { statusCode?: number }).statusCode ?? 500;
        res.status(status).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to upload image',
        });
      }
    },
  );
}

export function registerMarketplaceMediaPublicRoute(app: Express, db: Firestore): void {
  app.get('/api/marketplace/media/:tenantId/:mediaId', async (req: Request, res: Response) => {
    try {
      const tenantId = String(req.params.tenantId);
      const mediaId = String(req.params.mediaId);
      const media = await loadStorefrontMedia(db, tenantId, mediaId);
      if (!media) {
        return res.status(404).json({ success: false, error: 'Image not found' });
      }
      res.setHeader('Content-Type', media.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.send(media.buffer);
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load image',
      });
    }
  });
}
