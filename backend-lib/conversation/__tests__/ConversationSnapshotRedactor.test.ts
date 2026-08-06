import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConversationSnapshotRedactor } from '../session/ConversationSnapshotRedactor.js';
import { ConversationStatus } from '../models/ConversationState.js';
import type { ConversationSnapshot } from '../models/ConversationSnapshot.js';

describe('ConversationSnapshotRedactor (Phase 2)', () => {
  const redactor = new ConversationSnapshotRedactor();

  const mockSnapshot: ConversationSnapshot = {
    snapshotId: 'snap_123',
    timestamp: 1000,
    recentSteps: [
      {
        id: 'step_1',
        role: 'user',
        message: 'My email is john.doe@gmail.com and phone is +91 9876543210. Deliver to 123 Main St, Bangalore 560001',
        timestamp: 1000,
      },
      {
        id: 'step_2',
        role: 'system',
        message: 'Auth token is eyJhbGciOiJIUzI1NiIsInR5cCI.eyJzdWIiOiIxMjM.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c and OpenAI key sk-1234567890abcdef1234567890abcdef1234567890abcdef',
        timestamp: 1001,
      }
    ],
    state: {
      sessionId: 'sess_1',
      conversationId: 'sess_1',
      tenantId: 'tenant_1',
      customerId: 'cust_abc123',
      currentLanguage: 'en',
      currentIntent: null,
      detectedEntities: [
        { type: 'Address', rawValue: '123 Fake St, City', normalizedValue: '123 Fake St' },
        { type: 'Phone', rawValue: '9876543210' },
        { type: 'FoodItem', rawValue: 'Chicken Biryani' },
      ],
      currentWorkflowStep: null,
      pendingQuestion: null,
      pendingConfirmation: false,
      currentCartReference: null,
      status: ConversationStatus.Completed,
      createdTime: 1000,
      updatedTime: 1001,
      historyReference: null,
      metadata: {
        rawUserEmail: 'john.doe@gmail.com',
        userAuthToken: 'secret_token_123',
        safeNotes: 'Customer prefers spicy food and can be reached at john.doe@gmail.com',
        openai_key: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef',
      },
    }
  };

  it('should redact emails, phones, addresses and secrets from transcript text', () => {
    const { snapshot, summary } = redactor.redact(mockSnapshot);
    assert.strictEqual(snapshot.recentSteps[0]?.message, 'My email is [REDACTED_EMAIL] and phone is [REDACTED_PHONE]. Deliver to [REDACTED_ADDRESS], Bangalore [REDACTED_ADDRESS]');
    assert.strictEqual(snapshot.recentSteps[1]?.message, 'Auth token is [REDACTED_JWT] and OpenAI key [REDACTED_OPENAI_KEY]');
    
    assert.strictEqual(summary['EMAIL'], 2); // 1 in transcript, 1 in metadata safeNotes
    assert.strictEqual(summary['PHONE'], 1);
    assert.strictEqual(summary['ADDRESS'], 2); // 123 Main St and 560001
    assert.strictEqual(summary['JWT'], 1);
    assert.strictEqual(summary['OPENAI_KEY'], 1);
  });

  it('should explicitly redact Address and Phone entity types', () => {
    const { snapshot, summary } = redactor.redact(mockSnapshot);
    assert.strictEqual(snapshot.state.detectedEntities[0]?.rawValue, '[REDACTED_ADDRESS]');
    assert.strictEqual(snapshot.state.detectedEntities[1]?.rawValue, '[REDACTED_PHONE]');
    assert.strictEqual(snapshot.state.detectedEntities[2]?.rawValue, 'Chicken Biryani');

    assert.strictEqual(summary['ENTITY_ADDRESS'], 1);
    assert.strictEqual(summary['ENTITY_PHONE'], 1);
  });

  it('should redact sensitive keys and regex matches in metadata', () => {
    const { snapshot, summary } = redactor.redact(mockSnapshot);
    assert.strictEqual(snapshot.state.metadata.rawUserEmail, '[REDACTED]');
    assert.strictEqual(snapshot.state.metadata.userAuthToken, '[REDACTED]');
    assert.strictEqual(snapshot.state.metadata.openai_key, '[REDACTED]');
    
    assert.strictEqual(snapshot.state.metadata.safeNotes, 'Customer prefers spicy food and can be reached at [REDACTED_EMAIL]');
    assert.strictEqual(summary['METADATA_KEY'], 3);
  });

  it('should hash customerId', () => {
    const { snapshot, summary } = redactor.redact(mockSnapshot);
    assert.ok(snapshot.state.customerId);
    assert.notStrictEqual(snapshot.state.customerId, 'cust_abc123');
    assert.ok(snapshot.state.customerId?.startsWith('hash_'));
    assert.strictEqual(summary['CUSTOMER_ID'], 1);
  });

  it('should deeply clone and not mutate the original input', () => {
    redactor.redact(mockSnapshot);
    assert.strictEqual(mockSnapshot.recentSteps[0]?.message, 'My email is john.doe@gmail.com and phone is +91 9876543210. Deliver to 123 Main St, Bangalore 560001');
    assert.strictEqual(mockSnapshot.state.customerId, 'cust_abc123');
  });
});
