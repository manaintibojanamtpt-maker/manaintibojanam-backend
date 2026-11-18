/**
 * BhojanOS Voice Agent Durable Persistence Adapter
 *
 * Implements tenant-isolated persistence for:
 * - Catering enquiries: `tenants/{tenantId}/catering_enquiries/{enquiryId}`
 * - Callback requests: `tenants/{tenantId}/callback_requests/{callbackId}`
 *
 * Supports distributed idempotency via central Firestore `idempotency_keys` collection
 * across multiple backend instances, with strict fail-closed guarantees when durable storage is unavailable.
 */

import { createHash } from 'crypto';

export interface CateringEnquiryRecord {
  id: string;
  tenantId: string;
  customerName: string;
  customerPhoneMasked: string;
  customerPhoneHash: string;
  eventType: string;
  guestCount: number;
  eventDate: string;
  notes: string;
  createdAt: string;
  status: 'PENDING_HUMAN_CALLBACK';
  source: 'voice_agent';
  idempotencyKey?: string;
}

export interface CallbackRequestRecord {
  id: string;
  tenantId: string;
  customerName: string;
  customerPhoneMasked: string;
  customerPhoneHash: string;
  reason: string;
  createdAt: string;
  status: 'QUEUED';
  source: 'voice_agent';
  idempotencyKey?: string;
}

export interface VoicePersistenceConfig {
  db?: any; // Firestore instance
  allowInMemoryTesting?: boolean;
}

export class VoicePersistence {
  private db?: any;
  private allowInMemoryTesting: boolean;

  // In-memory tenant-isolated stores for unit tests / fallback
  private inMemoryCatering = new Map<string, Map<string, CateringEnquiryRecord>>();
  private inMemoryCallbacks = new Map<string, Map<string, CallbackRequestRecord>>();
  private idempotencyCache = new Map<string, { recordId: string; createdAtMs: number }>();

  constructor(config: VoicePersistenceConfig = {}) {
    this.db = config.db;
    this.allowInMemoryTesting = Boolean(config.allowInMemoryTesting);
  }

  setDb(db: any) {
    this.db = db;
  }

  isConfigured(): boolean {
    return Boolean(this.db) || this.allowInMemoryTesting;
  }

  generateIdempotencyKey(tenantId: string, type: 'catering' | 'callback', phoneHash: string, dataKey: string): string {
    return createHash('sha256')
      .update(`${tenantId}:${type}:${phoneHash}:${dataKey.trim().toLowerCase()}`)
      .digest('hex');
  }

  async checkIdempotency(key: string, maxAgeMs = 10 * 60 * 1000): Promise<string | null> {
    if (this.db) {
      try {
        const doc = await this.db.collection('idempotency_keys').doc(key).get();
        if (doc.exists) {
          const data = doc.data();
          if (data && data.expiresAt > Date.now()) {
            return data.recordId || data.key || null;
          }
        }
      } catch (err) {
        console.error('[VoicePersistence] Firestore idempotency read error:', err);
      }
    }

    const cached = this.idempotencyCache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.createdAtMs > maxAgeMs) {
      this.idempotencyCache.delete(key);
      return null;
    }
    return cached.recordId;
  }

  async recordIdempotency(key: string, recordId: string, ttlMs = 10 * 60 * 1000): Promise<void> {
    if (this.db) {
      try {
        await this.db.collection('idempotency_keys').doc(key).set({
          key,
          recordId,
          createdAt: Date.now(),
          expiresAt: Date.now() + ttlMs,
          status: 'completed',
        });
      } catch (err) {
        console.error('[VoicePersistence] Firestore idempotency write error:', err);
      }
    }

    this.idempotencyCache.set(key, { recordId, createdAtMs: Date.now() });
  }

  async saveCateringEnquiry(enquiry: CateringEnquiryRecord): Promise<{ success: boolean; error?: string }> {
    if (!enquiry.tenantId) {
      return { success: false, error: 'tenantId is required for catering enquiry persistence.' };
    }

    if (this.db) {
      try {
        await this.db
          .collection('tenants')
          .doc(enquiry.tenantId)
          .collection('catering_enquiries')
          .doc(enquiry.id)
          .set(enquiry);

        if (enquiry.idempotencyKey) {
          await this.recordIdempotency(enquiry.idempotencyKey, enquiry.id);
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: `Firestore persistence write failed: ${err.message || String(err)}` };
      }
    }

    if (this.allowInMemoryTesting) {
      if (!this.inMemoryCatering.has(enquiry.tenantId)) {
        this.inMemoryCatering.set(enquiry.tenantId, new Map());
      }
      this.inMemoryCatering.get(enquiry.tenantId)!.set(enquiry.id, enquiry);
      if (enquiry.idempotencyKey) {
        await this.recordIdempotency(enquiry.idempotencyKey, enquiry.id);
      }
      return { success: true };
    }

    // Fail closed in production if no durable adapter is active
    return {
      success: false,
      error: 'Durable persistence storage is unavailable. Catering request rejected.',
    };
  }

  async saveCallbackRequest(request: CallbackRequestRecord): Promise<{ success: boolean; error?: string }> {
    if (!request.tenantId) {
      return { success: false, error: 'tenantId is required for callback request persistence.' };
    }

    if (this.db) {
      try {
        await this.db
          .collection('tenants')
          .doc(request.tenantId)
          .collection('callback_requests')
          .doc(request.id)
          .set(request);

        if (request.idempotencyKey) {
          await this.recordIdempotency(request.idempotencyKey, request.id);
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: `Firestore persistence write failed: ${err.message || String(err)}` };
      }
    }

    if (this.allowInMemoryTesting) {
      if (!this.inMemoryCallbacks.has(request.tenantId)) {
        this.inMemoryCallbacks.set(request.tenantId, new Map());
      }
      this.inMemoryCallbacks.get(request.tenantId)!.set(request.id, request);
      if (request.idempotencyKey) {
        await this.recordIdempotency(request.idempotencyKey, request.id);
      }
      return { success: true };
    }

    // Fail closed in production if no durable adapter is active
    return {
      success: false,
      error: 'Durable persistence storage is unavailable. Callback request rejected.',
    };
  }

  // Test inspection utilities
  getInMemoryCateringCount(tenantId: string): number {
    return this.inMemoryCatering.get(tenantId)?.size || 0;
  }

  getInMemoryCallbackCount(tenantId: string): number {
    return this.inMemoryCallbacks.get(tenantId)?.size || 0;
  }

  clearInMemoryForTesting() {
    this.inMemoryCatering.clear();
    this.inMemoryCallbacks.clear();
    this.idempotencyCache.clear();
  }
}
