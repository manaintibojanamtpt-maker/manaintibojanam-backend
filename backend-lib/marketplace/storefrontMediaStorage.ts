import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';

export const MAX_STOREFRONT_MEDIA_BYTES = 380 * 1024;

export type StorefrontMediaKind = 'cover' | 'gallery' | 'logo';

export interface StorefrontMediaRecord {
  readonly kind: StorefrontMediaKind;
  readonly contentType: string;
  readonly dataBase64: string;
  readonly fileSize: number;
  readonly uploadedBy: string;
  readonly uploadedAt: ReturnType<typeof FieldValue.serverTimestamp>;
}

export function buildStorefrontMediaPublicPath(tenantId: string, mediaId: string): string {
  return `/api/marketplace/media/${tenantId}/${mediaId}`;
}

export function buildStorefrontMediaPublicUrl(
  apiOrigin: string,
  tenantId: string,
  mediaId: string,
): string {
  const base = apiOrigin.replace(/\/$/, '');
  return `${base}${buildStorefrontMediaPublicPath(tenantId, mediaId)}`;
}

export async function saveStorefrontMedia(
  db: Firestore,
  fieldValue: typeof FieldValue,
  input: {
    tenantId: string;
    kind: StorefrontMediaKind;
    contentType: string;
    buffer: Buffer;
    uploadedBy: string;
  },
): Promise<{ mediaId: string; fileSize: number }> {
  if (input.buffer.length <= 0 || input.buffer.length > MAX_STOREFRONT_MEDIA_BYTES) {
    throw Object.assign(
      new Error(`Image must be between 1 byte and ${Math.round(MAX_STOREFRONT_MEDIA_BYTES / 1024)}KB after compression.`),
      { statusCode: 400 },
    );
  }

  const mediaId = `${input.kind}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  await db
    .collection('tenants')
    .doc(input.tenantId)
    .collection('storefrontMedia')
    .doc(mediaId)
    .set({
      kind: input.kind,
      contentType: input.contentType || 'image/jpeg',
      dataBase64: input.buffer.toString('base64'),
      fileSize: input.buffer.length,
      uploadedBy: input.uploadedBy,
      uploadedAt: fieldValue.serverTimestamp(),
    } satisfies StorefrontMediaRecord);

  return { mediaId, fileSize: input.buffer.length };
}

export async function loadStorefrontMedia(
  db: Firestore,
  tenantId: string,
  mediaId: string,
): Promise<{ contentType: string; buffer: Buffer } | null> {
  const snap = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('storefrontMedia')
    .doc(mediaId)
    .get();
  if (!snap.exists) return null;
  const data = snap.data() as { contentType?: string; dataBase64?: string };
  if (!data.dataBase64) return null;
  return {
    contentType: data.contentType || 'image/jpeg',
    buffer: Buffer.from(data.dataBase64, 'base64'),
  };
}
