import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { buildAiAuditEvent } from '../auditContracts.js';
import {
  AiAuditEventRepository,
  AI_AUDIT_COLLECTION,
} from '../aiAuditEventRepository.js';
import {
  configureAiAuditPersistence,
  resetAiAuditPersistenceForTests,
  schedulePersistAiAuditEvent,
} from '../aiAuditPersistence.js';
import { readAiAuditPersistenceConfig } from '../aiAuditPersistenceConfig.js';
import {
  emitAiAuditEvent,
  resetAiMetricsCollectorForTests,
} from '../aiMetricsCollector.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

function createMockDb() {
  const store = new Map<string, Record<string, unknown>>();
  return {
    store,
    collection(name: string) {
      assert.equal(name, AI_AUDIT_COLLECTION);
      return {
        doc(id: string) {
          return {
            async set(data: Record<string, unknown>) {
              store.set(id, data);
              return id;
            },
          };
        },
        orderBy() {
          return {
            limit() {
              return {
                async get() {
                  const docs = [...store.entries()].map(([id, data]) => ({
                    id,
                    data: () => data,
                  }));
                  return { docs };
                },
              };
            },
          };
        },
      };
    },
  };
}

describe('AI audit persistence Phase 21', () => {
  const prevFlag = process.env.AI_AUDIT_PERSISTENCE_ENABLED;

  beforeEach(() => {
    resetAiMetricsCollectorForTests();
    resetAiAuditPersistenceForTests();
    delete process.env.AI_AUDIT_PERSISTENCE_ENABLED;
  });

  afterEach(() => {
    if (prevFlag === undefined) delete process.env.AI_AUDIT_PERSISTENCE_ENABLED;
    else process.env.AI_AUDIT_PERSISTENCE_ENABLED = prevFlag;
    resetAiAuditPersistenceForTests();
    resetAiMetricsCollectorForTests();
  });

  it('defaults AI_AUDIT_PERSISTENCE_ENABLED OFF', () => {
    assert.equal(readAiAuditPersistenceConfig({}).enabled, false);
    assert.equal(readAiAuditPersistenceConfig({ AI_AUDIT_PERSISTENCE_ENABLED: 'true' }).enabled, true);
  });

  it('repository writes durable documents with eventId + persistedAt', async () => {
    const mock = createMockDb();
    const repo = new AiAuditEventRepository({ db: mock as never });
    const event = buildAiAuditEvent({
      eventType: 'ai.assist.blocked',
      correlationId: 'corr-1',
      success: false,
      errorCode: 'AI_CANARY_EXCLUDED',
      canaryBucket: 7,
      canaryGateApplied: true,
      channel: 'orderbhojan_web',
      mode: 'consumer_ordering',
    });

    const result = await repo.writeEvent(event);
    assert.ok(result.eventId);
    assert.equal(mock.store.size, 1);
    const doc = mock.store.get(result.eventId)!;
    assert.equal(doc.eventType, 'ai.assist.blocked');
    assert.equal(doc.correlationId, 'corr-1');
    assert.equal(doc.canaryBucket, 7);
    assert.equal(doc.mutatedState, false);
    assert.ok(typeof doc.persistedAt === 'string');
  });

  it('repository skips writes when Firestore is backed off', async () => {
    const mock = createMockDb();
    const repo = new AiAuditEventRepository({
      db: mock as never,
      isBackedOff: () => true,
    });
    const result = await repo.writeEvent(
      buildAiAuditEvent({
        eventType: 'ai.assist.request',
        correlationId: 'c',
        success: true,
      }),
    );
    assert.equal(result.skipped, 'firestore_quota_backoff');
    assert.equal(mock.store.size, 0);
  });

  it('schedulePersist is no-op when flag OFF', async () => {
    const mock = createMockDb();
    configureAiAuditPersistence({ db: mock as never });
    process.env.AI_AUDIT_PERSISTENCE_ENABLED = 'false';
    schedulePersistAiAuditEvent(
      buildAiAuditEvent({
        eventType: 'ai.cart_plan.confirmed',
        correlationId: 'c',
        success: true,
        phase: 4,
      }),
    );
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(mock.store.size, 0);
  });

  it('emitAiAuditEvent persists when flag ON and repo configured', async () => {
    const mock = createMockDb();
    configureAiAuditPersistence({ db: mock as never });
    process.env.AI_AUDIT_PERSISTENCE_ENABLED = 'true';

    emitAiAuditEvent(undefined, 'info', {
      eventType: 'ai.cart_plan.discarded',
      correlationId: 'c-discard',
      success: true,
      phase: 4,
      channel: 'orderbhojan_web',
      mode: 'consumer_ordering',
    });

    await new Promise((r) => setTimeout(r, 40));
    assert.equal(mock.store.size, 1);
    const doc = [...mock.store.values()][0]!;
    assert.equal(doc.eventType, 'ai.cart_plan.discarded');
  });

  it('gateway status + ops expose phase 21 audit persistence contracts', () => {
    const gateway = readFileSync(
      join(repoRoot, 'backend-lib/ai/registerAiGatewayRoutes.ts'),
      'utf8',
    );
    const ops = readFileSync(
      join(repoRoot, 'backend-lib/observability/registerOpsRoutes.ts'),
      'utf8',
    );
    const env = readFileSync(join(repoRoot, '.env.example'), 'utf8');
    const client = readFileSync(
      join(repoRoot, 'orderbhojan/src/features/assistant/infrastructure/assistantApiClient.ts'),
      'utf8',
    );
    const conversation = readFileSync(
      join(repoRoot, 'orderbhojan/src/features/assistant/ui/useAssistantConversation.ts'),
      'utf8',
    );

    assert.match(gateway, /phase:\s*(?:21|22|[2-9]\d+)/);
    assert.match(gateway, /auditPersistence:\s*true/);
    assert.match(gateway, /cartPlanDecisionAudit:\s*true/);
    assert.match(gateway, /cart-plan\/decision/);
    assert.match(gateway, /ai\.cart_plan\.confirmed|ai\.cart_plan\.discarded/);
    assert.match(ops, /\/api\/ops\/ai\/audit-events/);
    assert.match(env, /AI_AUDIT_PERSISTENCE_ENABLED=false/);
    assert.match(client, /reportCartPlanDecision/);
    assert.match(conversation, /reportCartPlanDecisionQuietly/);
    assert.match(conversation, /decision:\s*'confirm'|decision:\s*"confirm"/);
    assert.match(conversation, /decision:\s*'discard'|decision:\s*"discard"/);
  });
});
