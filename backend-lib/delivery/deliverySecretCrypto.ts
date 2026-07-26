import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm' as const;

function resolveMasterKey(): Buffer {
  const raw =
    process.env.DELIVERY_INTEGRATION_SECRET_KEY ||
    process.env.INTEGRATION_SECRET_KEY ||
    '';
  if (!raw.trim()) {
    // Dev/test fallback — never use in production without env override.
    return createHash('sha256').update('bhojanos-dev-delivery-secret-key').digest();
  }
  // Accept 64-hex or arbitrary passphrase (hashed to 32 bytes).
  if (/^[0-9a-fA-F]{64}$/.test(raw.trim())) {
    return Buffer.from(raw.trim(), 'hex');
  }
  return createHash('sha256').update(raw.trim()).digest();
}

export function encryptDeliveryCredentials(
  credentials: Record<string, string>,
): { ciphertext: string; iv: string; algorithm: typeof ALGO } {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, resolveMasterKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(credentials), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString('base64'),
    iv: iv.toString('base64'),
    algorithm: ALGO,
  };
}

export function decryptDeliveryCredentials(input: {
  readonly ciphertext: string;
  readonly iv: string;
}): Record<string, string> {
  const buf = Buffer.from(input.ciphertext, 'base64');
  const tag = buf.subarray(buf.length - 16);
  const data = buf.subarray(0, buf.length - 16);
  const decipher = createDecipheriv(ALGO, resolveMasterKey(), Buffer.from(input.iv, 'base64'));
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  const parsed = JSON.parse(plaintext) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === 'string' && v.trim()) out[k] = v.trim();
  }
  return out;
}

export function buildSecretRef(tenantId: string, provider: string): string {
  return `tenants/${tenantId}/deliveryProviderSecrets/${provider}`;
}
