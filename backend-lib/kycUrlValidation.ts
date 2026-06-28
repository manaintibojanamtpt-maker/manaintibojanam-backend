const DEFAULT_BUCKET = 'bhojanos2.firebasestorage.app';

export function validateKycStorageUrl(
  url: string,
  tenantId: string,
  bucketName = process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_BUCKET,
): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'firebasestorage.googleapis.com') {
      return false;
    }

    const bucketSegment = `/b/${bucketName}/o/`;
    if (!parsed.pathname.includes(bucketSegment)) {
      return false;
    }

    const objectPath = decodeURIComponent(parsed.pathname.split(bucketSegment)[1] || '');
    return objectPath.startsWith(`kyc/${tenantId}/`);
  } catch {
    return false;
  }
}
