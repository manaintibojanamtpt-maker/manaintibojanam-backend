import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultIntentPipeline } from '../workflow/intent/IntentPipeline.js';
import { ConversationPolicyEngine } from '../workflow/ConversationPolicyEngine.js';
import { WorkflowEngine } from '../workflow/WorkflowEngine.js';
import { ConversationIntent } from '../models/ConversationIntent.js';
import { ConversationStatus } from '../models/ConversationState.js';
import { mapWorkflowToAssistResponse } from '../engine/mapWorkflowToAssistResponse.js';

describe('Voice End-to-End Acceptance: Telugu Code-Mixed Ordering', () => {
  it('processes "Anna rendu chicken biryani parcel cheyyandi" through normalizer, intent resolver, entity extractor, policy and workflow', () => {
    // 1. Setup realistic restaurant menu catalog
    const menuCatalog = [
      { id: 'item_cb_01', name: 'Chicken Biryani' },
      { id: 'item_mb_02', name: 'Mutton Biryani' },
      { id: 'item_pb_03', name: 'Paneer Biryani' },
    ];

    // 2. Instantiate pipeline & workflow engine
    const pipeline = createDefaultIntentPipeline({
      menu: menuCatalog,
      locale: 'te-IN',
    });
    const policyEngine = new ConversationPolicyEngine();
    const workflowEngine = new WorkflowEngine(pipeline, policyEngine);

    // 3. User utterance captured via Sarvam STT
    const rawTranscript = 'Anna rendu chicken biryani parcel cheyyandi';

    const turnResult = workflowEngine.evaluateTurn({
      rawTranscript,
      state: {
        sessionId: 'sess_test_123',
        conversationId: 'conv_test_123',
        tenantId: 'tenant_andhra_kitchen',
        currentLanguage: 'te-IN',
        currentIntent: null,
        detectedEntities: [],
        currentWorkflowStep: null,
        pendingQuestion: null,
        pendingConfirmation: false,
        currentCartReference: null,
        status: ConversationStatus.Idle,
        createdTime: Date.now(),
        updatedTime: Date.now(),
        metadata: {},
        historyReference: null,
      },
    });

    // 4. Verify pure deterministic Intent Resolution & Entity Extraction
    assert.equal(turnResult.intent, ConversationIntent.AddItem);
    assert.equal(turnResult.kind, 'proceed');
    assert.ok(turnResult.confidence >= 0.8);
    // Verify TranscriptNormalizer normalized "parcel" -> "takeaway"
    assert.ok(turnResult.normalizedTranscript.includes('takeaway'));

    // Verify FoodItem entity
    const foodEntity = turnResult.entities.find((e) => e.type === 'FoodItem');
    assert.ok(foodEntity, 'FoodItem entity should be extracted');
    assert.equal(foodEntity.rawValue, 'chicken biryani');
    assert.equal(foodEntity.normalizedValue, 'Chicken Biryani');
    assert.equal((foodEntity as any).menuItemId, 'item_cb_01');

    // Verify Quantity entity
    const quantityEntity = turnResult.entities.find((e) => e.type === 'Quantity');
    assert.ok(quantityEntity, 'Quantity entity should be extracted');
    assert.equal((quantityEntity as any).numericValue, 2);

    // 5. Verify mapping to safe non-executable cart proposal for client
    const assistResponse = mapWorkflowToAssistResponse({
      result: {
        snapshot: null,
        success: true,
        fallthroughToLlm: false,
        workflowDecision: turnResult.kind,
        workflowIntent: turnResult.intent,
        confidence: turnResult.confidence,
        systemReply: 'Added 2 Chicken Biryani to your order.',
        proposedActions: [
          {
            type: 'add_item',
            payload: {
              menuItemId: (foodEntity as any).menuItemId,
              name: foodEntity.normalizedValue,
              quantity: (quantityEntity as any).numericValue,
            },
          },
        ],
      },
      mode: 'consumer_ordering',
      channel: 'orderbhojan_web',
      conversationId: 'conv_test_123',
      restaurantId: 'tenant_andhra_kitchen',
      readOnlyConsumer: true,
    });

    assert.equal(assistResponse.success, true);
    assert.equal(assistResponse.reply, 'Added 2 Chicken Biryani to your order.');
    assert.equal(assistResponse.structured.proposedActions[0].type, 'cart_add_plan');
    assert.equal(assistResponse.structured.proposedActions[0].requiresConfirmation, true);
    assert.equal(assistResponse.structured.proposedActions[0].executable, false);
    assert.equal((assistResponse.structured.proposedActions[0].payload as any).quantity, 2);
    assert.equal((assistResponse.structured.proposedActions[0].payload as any).foodId, 'item_cb_01');
    assert.equal((assistResponse.structured.proposedActions[0].payload as any).name, 'Chicken Biryani');
  });
});
