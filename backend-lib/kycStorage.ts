import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'crypto';

export async function uploadKycDocumentAdmin(
  app: { options?: { storageBucket?: string } },
  tenantId: string,
  slot: string,
  fileName: string,
  contentType: string,
  buffer: Buffer,
): Promise<string> {
  const storage = getStorage(app);
  const bucketName = app.options?.storageBucket || process.env.FIREBASE_STORAGE_BUCKET || 'bhojanos2.firebasestorage.app';
  const bucket = storage.bucket(bucketName);

  const safeBase = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const storageName = `${slot}-${Date.now()}-${safeBase}`;
  const filePath = `kyc/${tenantId}/${storageName}`;
  const token = randomUUID();

  const file = bucket.file(filePath);
  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: token,
        tenantId,
        slot,
        originalFileName: fileName,
      },
    },
  });

  const encodedPath = encodeURIComponent(filePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
}
