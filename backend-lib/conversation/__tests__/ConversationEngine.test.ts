import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConversationEngine } from '../engine/ConversationEngine.js';
import { SessionManager, InMemoryConversationRepository } from '../session/SessionManager.js';
import { ConversationStatus } from '../models/ConversationState.js';
import { ConversationIntent } from '../models/ConversationIntent.js';
import {
  mapConversationIntentToAssistantIntent,
  mapWorkflowToAssistResponse,
} from '../engine/mapWorkflowToAssistResponse.js';

describe('ConversationEngine (workflow-owned turns)', () => {
  it('greets deterministically without LLM fallthrough', async () => {
    const sessionManager = new SessionManager(new InMemoryConversationRepository());
    const engine = new ConversationEngine(sessionManager);
    const session = await sessionManager.createSession('tenant_test');

    const result = await engine.receiveTranscript(session.sessionId, 'Hello', {
      clientPlatform: 'web',
      preferredLanguage: 'en-IN',
    });

    assert.equal(result.success, true);
    assert.equal(result.fallthroughToLlm, false);
    assert.equal(result.workflowIntent, ConversationIntent.Greeting);
    assert.match(result.systemReply ?? '', /order/i);
    assert.ok(result.snapshot);
    assert.ok(result.snapshot.recentSteps.length >= 1);
  });

  it('adds menu item via workflow when catalog is provided', async () => {
    const sessionManager = new SessionManager(new InMemoryConversationRepository());
    const engine = new ConversationEngine(sessionManager);
    const session = await sessionManager.createSession('kitchen_1');

    const result = await engine.receiveTranscript(session.sessionId, 'add 2 chicken biryani', {
      clientPlatform: 'web',
      restaurantId: 'kitchen_1',
      menu: [{ id: 'food_biryani', name: 'Chicken Biryani' }],
    });

    assert.equal(result.success, true);
    assert.equal(result.fallthroughToLlm, false);
    assert.equal(result.workflowIntent, ConversationIntent.AddItem);
    assert.ok(result.proposedActions?.some((a) => a.type === 'add_item'));
  });

  it('falls through to LLM for unknown utterances', async () => {
    const sessionManager = new SessionManager(new InMemoryConversationRepository());
    const engine = new ConversationEngine(sessionManager);
    const session = await sessionManager.createSession('tenant_test');

    const result = await engine.receiveTranscript(
      session.sessionId,
      'what is the meaning of life in quantum physics?',
      { clientPlatform: 'web' },
    );

    assert.equal(result.success, true);
    assert.equal(result.fallthroughToLlm, true);
    assert.equal(result.workflowIntent, ConversationIntent.Unknown);
  });

  it('ensures session when missing', async () => {
    const sessionManager = new SessionManager(new InMemoryConversationRepository());
    const engine = new ConversationEngine(sessionManager);

    const result = await engine.receiveTranscript('conv_fixed_id', 'hi', {
      clientPlatform: 'web',
      tenantId: 'tenant_x',
      ensureSession: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.snapshot?.state.sessionId, 'conv_fixed_id');
    assert.equal(result.fallthroughToLlm, false);
  });

  it('returns error for missing session when ensure is false', async () => {
    const sessionManager = new SessionManager(new InMemoryConversationRepository());
    const engine = new ConversationEngine(sessionManager);

    const result = await engine.receiveTranscript('missing', 'Hello', {
      clientPlatform: 'unknown',
      ensureSession: false,
    });

    assert.equal(result.success, false);
    assert.match(result.error ?? '', /not found/);
    assert.equal(result.fallthroughToLlm, true);
  });
});

describe('mapWorkflowToAssistResponse', () => {
  it('maps add_item to cart_add_plan', () => {
    const response = mapWorkflowToAssistResponse({
      result: {
        snapshot: null,
        success: true,
        systemReply: 'Adding 2 × Chicken Biryani to your cart.',
        workflowDecision: 'proceed',
        workflowIntent: ConversationIntent.AddItem,
        confidence: 0.9,
        proposedActions: [
          {
            type: 'add_item',
            payload: { menuItemId: 'food_biryani', name: 'Chicken Biryani', quantity: 2 },
          },
        ],
      },
      mode: 'consumer_ordering',
      channel: 'orderbhojan_web',
      conversationId: 'c1',
      restaurantId: 'r1',
      readOnlyConsumer: true,
    });

    assert.equal(response.provider.name, 'conversation_engine');
    assert.equal(response.intent, 'search_menu');
    const plan = response.structured.proposedActions.find((a) => a.type === 'cart_add_plan');
    assert.ok(plan);
    assert.equal(plan?.payload?.foodId, 'food_biryani');
    assert.equal(plan?.payload?.quantity, 2);
    assert.equal(plan?.payload?.restaurantId, 'r1');
    assert.equal(plan?.requiresConfirmation, true);
    assert.equal(plan?.executable, false);
  });

  it('maps schedule clarify ask_clarification to schedule_clarify stub', () => {
    const response = mapWorkflowToAssistResponse({
      result: {
        snapshot: null,
        success: true,
        systemReply: 'Please say a clear time — now, 8 PM, or tomorrow lunch.',
        workflowDecision: 'clarify',
        workflowIntent: ConversationIntent.ScheduleDelivery,
        confidence: 0.85,
        proposedActions: [
          {
            type: 'ask_clarification',
            payload: {
              reason: 'AmbiguousDeliveryTime',
              missingEntities: ['DeliveryTime'],
            },
          },
        ],
      },
      mode: 'consumer_ordering',
      channel: 'orderbhojan_web',
      conversationId: 'c1',
      readOnlyConsumer: true,
    });

    const clarify = response.structured.proposedActions.find((a) => a.reason === 'schedule_clarify');
    assert.ok(clarify);
    assert.equal(clarify?.type, 'none');
    assert.equal(clarify?.payload?.action, 'schedule_clarify');
    assert.equal(clarify?.payload?.reason, 'AmbiguousDeliveryTime');
  });
});

describe('SessionManager.ensureSession', () => {
  it('creates with caller-provided id', async () => {
    const manager = new SessionManager(new InMemoryConversationRepository());
    const session = await manager.ensureSession('assist_abc', 'tenant_1');
    assert.equal(session.sessionId, 'assist_abc');
    const again = await manager.ensureSession('assist_abc', 'tenant_1');
    assert.equal(again.sessionId, 'assist_abc');
    assert.equal(again.snapshot.state.status, ConversationStatus.Idle);
  });
});
