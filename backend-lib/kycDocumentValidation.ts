export type KycDocumentSlot = 'identity' | 'business';

export interface KycFileDescriptor {
  name: string;
  size: number;
  type: string;
}

const IDENTITY_ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const BUSINESS_ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const AADHAAR_FILENAME = /aadhaar|aadhar|uidai/i;
const IDENTITY_REJECT_FILENAME = /\b(pan|passport|voter|driving|dl)\b/i;

const BUSINESS_ACCEPT_FILENAME =
  /\b(gst|trade[\s_-]?license|msme|udyam|shop[\s_-]?establishment|fssai|incorporation|business)\b/i;

const MAX_KYC_BYTES = 750 * 1024;

export function validateKycDocument(file: KycFileDescriptor, slot: KycDocumentSlot): string | null {
  if (file.size > MAX_KYC_BYTES) {
    return 'File must be 750KB or smaller.';
  }

  const lower = file.name.trim().toLowerCase();

  if (slot === 'identity') {
    if (!IDENTITY_ALLOWED_TYPES.has(file.type)) {
      return 'Aadhaar must be a PDF or image (JPEG, PNG, WebP).';
    }
    if (IDENTITY_REJECT_FILENAME.test(lower)) {
      return 'This slot is for Aadhaar only. PAN, Passport, and other IDs are not accepted here.';
    }
    if (!AADHAAR_FILENAME.test(lower)) {
      return 'Use your Aadhaar file only — rename it to include "Aadhaar" (e.g. aadhaar.pdf) and try again.';
    }
    return null;
  }

  if (!BUSINESS_ALLOWED_TYPES.has(file.type)) {
    return 'Business proof must be a PDF or image (JPEG, PNG, WebP).';
  }
  if (!BUSINESS_ACCEPT_FILENAME.test(lower)) {
    return 'Upload a business document (GST, Trade License, MSME, etc.) with a matching file name.';
  }
  return null;
}

export function getExistingDocumentMeta(
  kyc: Record<string, unknown> | undefined,
  slot: KycDocumentSlot,
): { url?: string; hash?: string; fileName?: string } {
  if (!kyc) return {};
  const prefix = slot === 'identity' ? 'identity' : 'business';
  return {
    url: kyc[`${prefix}DocumentUrl`] as string | undefined,
    hash: kyc[`${prefix}DocumentHash`] as string | undefined,
    fileName: kyc[`${prefix}DocumentFileName`] as string | undefined,
  };
}

export function assertNotDuplicateUpload(
  fileHash: string,
  slot: KycDocumentSlot,
  kyc: Record<string, unknown> | undefined,
): void {
  const existing = getExistingDocumentMeta(kyc, slot);
  if (existing.url) {
    throw new Error(
      slot === 'identity'
        ? 'Aadhaar is already uploaded for this kitchen.'
        : 'A business document is already uploaded for this kitchen.',
    );
  }
  if (existing.hash && existing.hash === fileHash) {
    throw new Error('This exact file was already uploaded. Choose a different document.');
  }
}
