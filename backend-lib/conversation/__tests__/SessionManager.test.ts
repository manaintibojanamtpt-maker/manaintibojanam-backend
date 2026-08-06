import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { SessionManager, InMemoryConversationRepository } from '../session/SessionManager.js';
import { ConversationStatus } from '../models/ConversationState.js';

describe('SessionManager (Phase 1)', () => {
  it('should create a new session correctly', async () => {
    const manager = new SessionManager(new InMemoryConversationRepository());
    const session = await manager.createSession('tenant_123', 'cust_456');

    assert.ok(session.sessionId.startsWith('sess_'));
    assert.strictEqual(session.tenantId, 'tenant_123');
    assert.strictEqual(session.customerId, 'cust_456');
    assert.strictEqual(session.snapshot.state.status, ConversationStatus.Idle);
    assert.strictEqual(session.snapshot.recentSteps.length, 0);
  });

  it('should load an existing session', async () => {
    const manager = new SessionManager(new InMemoryConversationRepository());
    const created = await manager.createSession('tenant_123');
    
    const loaded = await manager.loadSession(created.sessionId);
    assert.ok(loaded);
    assert.strictEqual(loaded.sessionId, created.sessionId);
    assert.strictEqual(loaded.tenantId, 'tenant_123');
  });

  it('should return null when loading non-existent session', async () => {
    const manager = new SessionManager(new InMemoryConversationRepository());
    const loaded = await manager.loadSession('fake_sess_id');
    assert.strictEqual(loaded, null);
  });

  it('should update a session state', async () => {
    const manager = new SessionManager(new InMemoryConversationRepository());
    const created = await manager.createSession('tenant_123');
    
    const newSnapshot = {
      ...created.snapshot,
      state: {
        ...created.snapshot.state,
        status: ConversationStatus.Thinking,
      }
    };

    await manager.updateSession(created.sessionId, newSnapshot);
    const loaded = await manager.loadSession(created.sessionId);
    
    assert.ok(loaded);
    assert.strictEqual(loaded.snapshot.state.status, ConversationStatus.Thinking);
  });

  it('should close a session correctly', async () => {
    const manager = new SessionManager(new InMemoryConversationRepository());
    const created = await manager.createSession('tenant_123');
    
    await manager.closeSession(created.sessionId);
    const loaded = await manager.loadSession(created.sessionId);
    
    assert.ok(loaded);
    assert.strictEqual(loaded.snapshot.state.status, ConversationStatus.Completed);
  });

  it('should expire a session correctly', async () => {
    const manager = new SessionManager(new InMemoryConversationRepository());
    const created = await manager.createSession('tenant_123');
    
    await manager.expireSession(created.sessionId);
    const loaded = await manager.loadSession(created.sessionId);
    
    assert.ok(loaded);
    assert.strictEqual(loaded.snapshot.state.status, ConversationStatus.TimedOut);
  });
});
