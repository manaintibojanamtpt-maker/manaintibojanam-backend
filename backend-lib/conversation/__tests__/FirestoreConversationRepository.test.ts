import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FirestoreConversationRepository } from '../session/FirestoreConversationRepository.js';
import { ConversationStatus } from '../models/ConversationState.js';
import type { ConversationSnapshot } from '../models/ConversationSnapshot.js';

// Minimal mock for Firestore
class MockFirestoreDoc {
  private data: any = null;
  
  constructor(public readonly id: string) {}
  
  async set(data: any, options: any) {
    if (options?.merge) {
      this.data = { ...this.data, ...data };
    } else {
      this.data = data;
    }
  }
  
  async get() {
    return {
      exists: this.data !== null,
      data: () => this.data,
    };
  }
  
  async delete() {
    this.data = null;
  }
}

class MockFirestoreCollection {
  private docs = new Map<string, MockFirestoreDoc>();
  
  doc(id: string) {
    if (!this.docs.has(id)) {
      this.docs.set(id, new MockFirestoreDoc(id));
    }
    return this.docs.get(id)!;
  }
}

class MockFirestore {
  private collections = new Map<string, MockFirestoreCollection>();
  
  collection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockFirestoreCollection());
    }
    return this.collections.get(name)!;
  }
}

describe('FirestoreConversationRepository', () => {
  it('should save a redacted snapshot and set metadata like TTL', async () => {
    const mockDb = new MockFirestore() as any;
    const repo = new FirestoreConversationRepository(mockDb);

    const snapshot: ConversationSnapshot = {
      snapshotId: 'snap_123',
      timestamp: 1000,
      recentSteps: [
        { id: '1', role: 'user', message: 'Hello +919876543210', timestamp: 1000 }
      ],
      state: {
        sessionId: 'sess_1',
        conversationId: 'sess_1',
        tenantId: 'tenant_1',
        customerId: 'cust_xyz',
        currentLanguage: 'en',
        currentIntent: null,
        detectedEntities: [],
        currentWorkflowStep: null,
        pendingQuestion: null,
        pendingConfirmation: false,
        currentCartReference: null,
        status: ConversationStatus.Idle,
        createdTime: 1000,
        updatedTime: 1000,
        metadata: {},
        historyReference: null,
      }
    };

    await repo.save(snapshot);

    const docRef = mockDb.collection('conversationSessions').doc('sess_1');
    const docSnap = await docRef.get();
    
    assert.strictEqual(docSnap.exists, true);
    const data = docSnap.data();

    // Verify Schema
    assert.strictEqual(data.sessionId, 'sess_1');
    assert.strictEqual(data.schemaVersion, '1.0');
    assert.ok(data.expiresAt > Date.now()); // TTL set correctly
    
    // Verify Redaction occurred
    assert.strictEqual(data.snapshot.recentSteps[0].message, 'Hello [REDACTED_PHONE]');
    assert.ok(data.snapshot.state.customerId.startsWith('hash_'));
    
    // Verify Redaction Summary exists
    assert.strictEqual(data.redactionSummary['PHONE'], 1);
    assert.strictEqual(data.redactionSummary['CUSTOMER_ID'], 1);
  });

  it('should load a saved snapshot', async () => {
    const mockDb = new MockFirestore() as any;
    const repo = new FirestoreConversationRepository(mockDb);

    const snapshot: ConversationSnapshot = {
      snapshotId: 'snap_123',
      timestamp: 1000,
      recentSteps: [],
      state: {
        sessionId: 'sess_1',
        conversationId: 'sess_1',
        tenantId: 'tenant_1',
        currentLanguage: 'en',
        currentIntent: null,
        detectedEntities: [],
        currentWorkflowStep: null,
        pendingQuestion: null,
        pendingConfirmation: false,
        currentCartReference: null,
        status: ConversationStatus.Idle,
        createdTime: 1000,
        updatedTime: 1000,
        metadata: {},
        historyReference: null,
      }
    };

    await repo.save(snapshot);
    const loaded = await repo.findById('sess_1');
    
    assert.ok(loaded);
    assert.strictEqual(loaded.snapshotId, 'snap_123');
  });

  it('should delete a session', async () => {
    const mockDb = new MockFirestore() as any;
    const repo = new FirestoreConversationRepository(mockDb);

    // Initial save
    await repo.save({
      snapshotId: 'snap_123',
      timestamp: 1000,
      recentSteps: [],
      state: {
        sessionId: 'sess_del',
        conversationId: 'sess_del',
        tenantId: 'tenant_1',
        currentLanguage: 'en',
        currentIntent: null,
        detectedEntities: [],
        currentWorkflowStep: null,
        pendingQuestion: null,
        pendingConfirmation: false,
        currentCartReference: null,
        status: ConversationStatus.Idle,
        createdTime: 1000,
        updatedTime: 1000,
        metadata: {},
        historyReference: null,
      }
    });

    let loaded = await repo.findById('sess_del');
    assert.ok(loaded);

    await repo.delete('sess_del');

    loaded = await repo.findById('sess_del');
    assert.strictEqual(loaded, null);
  });
});
