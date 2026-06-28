import { doc, updateDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import { getDb } from '../lib/firebase-db';
import { buildInlineKycDocumentUrl, MAX_INLINE_KYC_BYTES } from '../lib/kycInlineDocument';
import type { KycDocumentSlot } from '../lib/kycDocumentValidation';

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not read file.'));
        return;
      }
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('Could not encode file.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

function mapFirestoreError(error: unknown): Error {
  const code = (error as { code?: string })?.code;
  if (code === 'permission-denied') {
    return new Error('Upload denied. Confirm you are signed in as the kitchen owner.');
  }
  if (code === 'resource-exhausted') {
    return new Error('Firestore quota exceeded. Try again in a few minutes.');
  }
  return error instanceof Error ? error : new Error('Upload failed.');
}

export async function uploadKycDocumentViaApi(
  file: File,
  tenantId: string,
  slot: KycDocumentSlot,
  fileHash: string,
  onProgress?: (message: string) => void,
): Promise<{ url: string; fileName: string }> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in again to upload documents.');
  }

  if (file.size > MAX_INLINE_KYC_BYTES) {
    throw new Error('File must be 750KB or smaller. Compress your PDF and try again.');
  }

  onProgress?.('Refreshing session…');
  await user.getIdToken(true);

  const sizeKb = Math.max(1, Math.round(file.size / 1024));
  onProgress?.(`Preparing ${sizeKb} KB…`);

  const dataBase64 = await readFileAsBase64(file);
  onProgress?.(`Saving ${sizeKb} KB securely…`);

  const db = getDb();
  const documentUrl = buildInlineKycDocumentUrl(tenantId, slot);
  const prefix = slot === 'identity' ? 'identity' : 'business';

  try {
    await updateDoc(doc(db, 'tenants', tenantId), {
      [`kyc.${prefix}DocumentDataBase64`]: dataBase64,
      [`kyc.${prefix}DocumentContentType`]: file.type || 'application/octet-stream',
      [`kyc.${prefix}DocumentUrl`]: documentUrl,
      [`kyc.${prefix}DocumentHash`]: fileHash,
      [`kyc.${prefix}DocumentFileName`]: file.name,
      [`kyc.${prefix}DocumentStorage`]: 'inline',
      'kyc.verificationLevel': 1,
      'kyc.status': 'pending_verification',
    });
  } catch (error) {
    throw mapFirestoreError(error);
  }

  onProgress?.('Done');

  return { url: documentUrl, fileName: file.name };
}
