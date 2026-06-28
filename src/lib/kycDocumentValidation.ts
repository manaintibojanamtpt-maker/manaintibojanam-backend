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

export async function hashFileSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function validateKycDocument(file: KycFileDescriptor, slot: KycDocumentSlot): string | null {
  if (file.size > MAX_KYC_BYTES) {
    return 'File must be 750KB or smaller.';
  }

  const name = file.name.trim();
  const lower = name.toLowerCase();

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

export async function assertNotDuplicateUpload(
  file: File,
  slot: KycDocumentSlot,
  kyc: Record<string, unknown> | undefined,
): Promise<void> {
  const existing = getExistingDocumentMeta(kyc, slot);
  if (existing.url) {
    throw new Error(
      slot === 'identity'
        ? 'Aadhaar is already uploaded for this kitchen. Remove it from admin support before re-uploading.'
        : 'A business document is already uploaded for this kitchen.',
    );
  }

  const fileHash = await hashFileSha256(file);
  if (existing.hash && existing.hash === fileHash) {
    throw new Error('This exact file was already uploaded. Choose a different document.');
  }
}

export function withUploadTimeout<T>(promise: Promise<T>, ms = 90000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('Upload timed out. Check your connection and try again.')), ms);
    }),
  ]);
}
