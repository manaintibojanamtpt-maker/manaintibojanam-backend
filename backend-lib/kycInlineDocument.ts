export const MAX_INLINE_KYC_BYTES = 750 * 1024;

export function buildInlineKycDocumentUrl(tenantId: string, slot: string): string {
  return `inline://kyc/${tenantId}/${slot}`;
}

export function parseInlineKycDocumentUrl(url: string): { tenantId: string; slot: string } | null {
  const match = /^inline:\/\/kyc\/([^/]+)\/(identity|business)$/.exec(url);
  if (!match) return null;
  return { tenantId: match[1], slot: match[2] };
}

export function isInlineKycDocumentUrl(url: string): boolean {
  return parseInlineKycDocumentUrl(url) !== null;
}
