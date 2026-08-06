import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConversationEngine } from '../engine/ConversationEngine.js';
import { SessionManager, InMemoryConversationRepository } from '../session/SessionManager.js';
import { ConversationStatus } from '../models/ConversationState.js';

describe('ConversationEngine (Phase 1)', () => {
  it('should process a transcript and return the updated snapshot', async () => {
    const sessionManager = new SessionManager(new InMemoryConversationRepository());
    const engine = new ConversationEngine(sessionManager);

    const session = await sessionManager.createSession('tenant_test');
    
    const context = {
      clientPlatform: 'unknown' as const,
      preferredLanguage: 'en-IN',
    };

    const result = await engine.receiveTranscript(session.sessionId, 'Hello world', context);

    assert.strictEqual(result.success, true);
    assert.ok(result.snapshot);
    assert.strictEqual(result.snapshot.state.status, ConversationStatus.Thinking);
    assert.strictEqual(result.snapshot.recentSteps.length, 1);
    assert.strictEqual(result.snapshot.recentSteps[0]?.message, 'Hello world');
    assert.strictEqual(result.snapshot.recentSteps[0]?.role, 'user');
  });

  it('should return an error for non-existent session', async () => {
    const sessionManager = new SessionManager(new InMemoryConversationRepository());
    const engine = new ConversationEngine(sessionManager);

    const context = {
      clientPlatform: 'unknown' as const,
      preferredLanguage: 'en-IN',
    };

    const result = await engine.receiveTranscript('fake_id', 'Hello', context);

    assert.strictEqual(result.success, false);
    assert.ok(result.error);
    assert.match(result.error, /not found/);
  });
});
