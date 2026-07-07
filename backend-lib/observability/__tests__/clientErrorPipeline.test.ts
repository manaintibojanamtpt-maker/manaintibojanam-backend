import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClientErrorDedupeKey,
  extractFirstStackFrame,
  ingestClientError,
  resetClientErrorPipelineCacheForTests,
  CLIENT_ERROR_DEDUPE_WINDOW_MS,
  CLIENT_ERROR_INCIDENT_TYPE,
} from '../clientErrorPipeline.js';
import { createIncidentRepository } from '../IncidentRepository.js';

function createMockDb() {
  const stores = new Map<string, Map<string, Record<string, unknown>>>();
  const clientErrors: Record<string, unknown>[] = [];

  const collection = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const bucket = stores.get(name)!;

    return {
      doc: (id: string) => ({
        set: async (data: Record<string, unknown>) => {
          bucket.set(id, { ...data });
        },
      }),
      add: async (data: Record<string, unknown>) => {
        if (name === 'client_errors') {
          clientErrors.push(data);
          return { id: `ce-${clientErrors.length}` };
        }
        const id = `auto-${bucket.size + 1}`;
        bucket.set(id, data);
        return { id };
      },
    };
  };

  return {
    collection,
    getIncidentStore: () => stores.get('system_incidents') ?? new Map(),
    getClientErrors: () => clientErrors,
  };
}

describe('clientErrorPipeline', () => {
  beforeEach(() => {
    resetClientErrorPipelineCacheForTests();
  });

  it('extractFirstStackFrame returns the first at-frame', () => {
    const stack = `Error: boom
    at Component (https://app.example/menu:42:10)
    at render (react-dom.js:100:5)`;
    assert.equal(
      extractFirstStackFrame(stack),
      'at Component (https://app.example/menu:42:10)',
    );
  });

  it('buildClientErrorDedupeKey is stable for same message, route, and frame', () => {
    const stack = 'Error: x\n    at Page (/orders:1:1)';
    const a = buildClientErrorDedupeKey('Payment failed', '/checkout', stack);
    const b = buildClientErrorDedupeKey('Payment failed', '/checkout', stack);
    assert.equal(a, b);
    assert.notEqual(
      buildClientErrorDedupeKey('Payment failed', '/cart', stack),
      a,
    );
  });

  it('ingestClientError persists unified incident with required fields', async () => {
    const mockDb = createMockDb();
    const repo = createIncidentRepository({
      db: mockDb as never,
      fieldValue: { serverTimestamp: () => 'SERVER_TS' } as never,
      isBackedOff: () => false,
      onQuotaError: () => undefined,
      isQuotaError: () => false,
    });

    let clock = 1_700_000_000_000;
    const result = await ingestClientError(
      {
        error: 'Unhandled rejection',
        info: {
          route: '/marketplace/search',
          userAgent: 'Mozilla/5.0 Test',
          stack: 'Error: x\n    at SearchPage (/search:12:3)',
          tenantId: 'tenant-a',
          uid: 'user-123',
          email: 'ops@example.com',
          severity: 'critical',
        },
      },
      { correlationId: 'corr-ce-1', clientIp: '10.0.0.1' },
      {
        repo,
        now: () => clock,
        resolveBuildRelease: () => ({ build: 'abc1234', release: '1.1.0' }),
      },
    );

    assert.equal(result.outcome, 'persisted');
    assert.ok(result.incidentId);
    assert.equal(result.severity, 'critical');
    assert.equal(result.payload.route, '/marketplace/search');
    assert.equal(result.payload.browser, 'Mozilla/5.0 Test');
    assert.equal(result.payload.build, 'abc1234');
    assert.equal(result.payload.release, '1.1.0');
    assert.equal(result.payload.dedupeKey, result.dedupeKey);
    assert.equal((result.payload.user as { uid?: string }).uid, 'user-123');

    const saved = mockDb.getIncidentStore().get(result.incidentId!);
    assert.ok(saved);
    assert.equal(saved?.type, CLIENT_ERROR_INCIDENT_TYPE);
    assert.equal(saved?.source, 'client');
    assert.equal(saved?.tenantId, 'tenant-a');
    assert.equal(saved?.route, '/marketplace/search');
    assert.equal(mockDb.getClientErrors().length, 1);
  });

  it('deduplicates identical errors within the 5-minute window', async () => {
    const mockDb = createMockDb();
    const repo = createIncidentRepository({
      db: mockDb as never,
      fieldValue: { serverTimestamp: () => 'SERVER_TS' } as never,
      isBackedOff: () => false,
      onQuotaError: () => undefined,
      isQuotaError: () => false,
    });

    let clock = 1_700_000_000_000;
    const body = {
      error: 'Same crash',
      info: {
        route: '/home',
        stack: 'Error: Same crash\n    at Home (/home:1:1)',
      },
    };

    const first = await ingestClientError(body, {}, { repo, now: () => clock });
    assert.equal(first.outcome, 'persisted');

    clock += 60_000;
    const second = await ingestClientError(body, {}, { repo, now: () => clock });
    assert.equal(second.outcome, 'deduped');
    assert.equal(second.dedupeKey, first.dedupeKey);
    assert.equal(mockDb.getIncidentStore().size, 1);
  });

  it('allows the same fingerprint after dedupe window expires', async () => {
    const mockDb = createMockDb();
    const repo = createIncidentRepository({
      db: mockDb as never,
      fieldValue: { serverTimestamp: () => 'SERVER_TS' } as never,
      isBackedOff: () => false,
      onQuotaError: () => undefined,
      isQuotaError: () => false,
    });

    let clock = 1_700_000_000_000;
    const body = {
      error: 'Repeat crash',
      info: { route: '/menu', stack: 'Error: Repeat\n    at Menu (/menu:2:2)' },
    };

    await ingestClientError(body, {}, { repo, now: () => clock });
    clock += CLIENT_ERROR_DEDUPE_WINDOW_MS + 1;
    const again = await ingestClientError(body, {}, { repo, now: () => clock });

    assert.equal(again.outcome, 'persisted');
    assert.equal(mockDb.getIncidentStore().size, 2);
  });

  it('skips persistence when Firestore is in quota backoff', async () => {
    const mockDb = createMockDb();
    const repo = createIncidentRepository({
      db: mockDb as never,
      fieldValue: { serverTimestamp: () => 'SERVER_TS' } as never,
      isBackedOff: () => true,
      onQuotaError: () => undefined,
      isQuotaError: () => false,
    });

    const result = await ingestClientError(
      { error: 'Quota storm', info: { route: '/x' } },
      {},
      { repo, isFirestoreBackedOff: () => true },
    );

    assert.equal(result.outcome, 'skipped_firestore_backoff');
    assert.equal(mockDb.getIncidentStore().size, 0);
  });
});
