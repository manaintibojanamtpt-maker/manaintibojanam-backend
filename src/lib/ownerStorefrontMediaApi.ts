import { auth } from '../firebase';
import { ownerApiRequest } from './ownerProvisioning';

export type StorefrontMediaKind = 'cover' | 'gallery' | 'logo';

const MAX_UPLOAD_BYTES = 380 * 1024;

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not read image.'));
        return;
      }
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('Could not encode image.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
}

/** Compress for API upload — keeps images small enough for Firestore subcollection storage (no GCS billing). */
export async function compressImageForStorefrontUpload(
  file: File,
  maxWidth = 960,
  maxHeight = 720,
  quality = 0.78,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare image.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not compress image.'))),
      'image/jpeg',
      quality,
    );
  });

  if (blob.size > MAX_UPLOAD_BYTES) {
    return compressImageForStorefrontUpload(
      new File([blob], file.name, { type: 'image/jpeg' }),
      Math.round(maxWidth * 0.85),
      Math.round(maxHeight * 0.85),
      Math.max(0.55, quality - 0.08),
    );
  }

  return blob;
}

export async function uploadStorefrontMediaViaApi(
  file: File,
  tenantId: string,
  kind: StorefrontMediaKind,
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in again to upload images.');
  }

  await user.getIdToken(true);
  const compressed = await compressImageForStorefrontUpload(file);
  if (compressed.size > MAX_UPLOAD_BYTES) {
    throw new Error('Image is still too large. Try a smaller photo.');
  }

  const fileBase64 = await readFileAsBase64(
    new File([compressed], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }),
  );

  const payload = await ownerApiRequest<{
    success: boolean;
    url: string;
    error?: string;
  }>('POST', `/api/owner/storefront/${tenantId}/media`, {
    kind,
    contentType: 'image/jpeg',
    fileBase64,
    fileSize: compressed.size,
  });

  if (!payload.url) {
    throw new Error('Upload succeeded but no image URL was returned.');
  }

  return payload.url;
}
