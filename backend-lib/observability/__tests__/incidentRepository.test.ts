import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLIENT_ERROR_MIRROR_TYPES,
  INCIDENT_SCHEMA_VERSION,
  KNOWN_INCIDENT_TYPES,
} from '../incidentTypes.js';
import {
  createIncidentRepository,
  getAutopilotIncidentTypes,
} from '../IncidentRepository.js';

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
      where: (field: string, op: string, value: unknown) => {
        const filters: Array<{ field: string; op: string; value: unknown }> = [
          { field, op, value },
        ];

        const runFilter = (rows: Array<{ id: string; data: Record<string, unknown> }>) =>
          rows.filter((row) =>
            filters.every((filter) => {
              const actual = row.data[filter.field];
              if (filter.op === '==') return actual === filter.value;
              if (filter.op === '>=') {
                return String(actual ?? '') >= String(filter.value ?? '');
              }
              return false;
            }),
          );

        const chain = {
          where: (nextField: string, nextOp: string, nextValue: unknown) => {
            filters.push({ field: nextField, op: nextOp, value: nextValue });
            return chain;
          },
          orderBy: () => chain,
          limit: (n: number) => ({
            get: async () => {
              const rows = [...bucket.entries()].map(([id, data]) => ({ id, data }));
              const filtered = runFilter(rows)
                .sort((a, b) => String(b.data.createdAt).localeCompare(String(a.data.createdAt)))
                .slice(0, n);
              return {
                docs: filtered.map((row) => ({
                  id: row.id,
                  data: () => row.data,
                })),
                size: filtered.length,
              };
            },
          }),
          count: () => ({
            get: async () => ({
              data: () => ({ count: runFilter([...bucket.entries()].map(([id, data]) => ({ id, data }))).length }),
            }),
          }),
          get: async () => ({
            docs: runFilter([...bucket.entries()].map(([id, data]) => ({ id, data }))).map((row) => ({
              id: row.id,
              data: () => row.data,
            })),
            size: runFilter([...bucket.entries()].map(([id, data]) => ({ id, data }))).length,
          }),
        };

        return chain;
      },
      orderBy: () => ({
        limit: (n: number) => ({
          get: async () => {
            const rows = [...bucket.entries()]
              .map(([id, data]) => ({ id, data }))
              .sort((a, b) => String(b.data.createdAt).localeCompare(String(a.data.createdAt)))
              .slice(0, n);
            return {
              docs: rows.map((row) => ({ id: row.id, data: () => row.data })),
              size: rows.length,
            };
          },
        }),
      }),
    };
  };

  return {
    collection,
    getIncidentStore: () => stores.get('system_incidents') ?? new Map(),
    getClientErrors: () => clientErrors,
  };
}

describe('IncidentRepository', () => {
  it('writes unified incident documents with schema version', async () => {
    const mockDb = createMockDb();
    const repo = createIncidentRepository({
      db: mockDb as never,
      fieldValue: { serverTimestamp: () => 'SERVER_TS' } as never,
      isBackedOff: () => false,
      onQuotaError: () => undefined,
      isQuotaError: () => false,
    });

    const result = await repo.writeIncident({
      type: 'system_errors',
      payload: { error: 'Test failure', route: '/owner/dashboard', tenantId: 'tenant-a' },
      correlationId: 'corr-1',
      source: 'monitoring',
    });

    assert.ok(result.incidentId);
    const store = mockDb.getIncidentStore();
    const saved = store.get(result.incidentId);
    assert.ok(saved);
    assert.equal(saved?.type, 'system_errors');
    assert.equal(saved?.schemaVersion, INCIDENT_SCHEMA_VERSION);
    assert.equal(saved?.correlationId, 'corr-1');
    assert.equal(saved?.tenantId, 'tenant-a');
    assert.equal(saved?.route, '/owner/dashboard');
  });

  it('mirrors selected incident types into client_errors', async () => {
    const mockDb = createMockDb();
    const repo = createIncidentRepository({
      db: mockDb as never,
      fieldValue: { serverTimestamp: () => 'SERVER_TS' } as never,
      isBackedOff: () => false,
      onQuotaError: () => undefined,
      isQuotaError: () => false,
    });

    await repo.writeIncident({
      type: 'payment_incidents',
      payload: { failureReason: 'Razorpay timeout', tenantId: 'kitchen-1' },
    });

    assert.equal(mockDb.getClientErrors().length, 1);
    assert.equal(mockDb.getClientErrors()[0].incidentType, 'payment_incidents');
  });

  it('counts incidents by type from system_incidents (AutoPilot path)', async () => {
    const mockDb = createMockDb();
    const repo = createIncidentRepository({
      db: mockDb as never,
      fieldValue: { serverTimestamp: () => 'SERVER_TS' } as never,
      isBackedOff: () => false,
      onQuotaError: () => undefined,
      isQuotaError: () => false,
    });

    const since = new Date(Date.now() - 3_600_000).toISOString();

    await repo.writeIncident({ type: 'api_errors', payload: { error: '500' } });
    await repo.writeIncident({ type: 'api_errors', payload: { error: '502' } });
    await repo.writeIncident({ type: 'system_errors', payload: { error: 'crash' } });

    const apiCount = await repo.countIncidentsByTypeSince('api_errors', since);
    const systemCount = await repo.countIncidentsByTypeSince('system_errors', since);

    assert.equal(apiCount, 2);
    assert.equal(systemCount, 1);
  });

  it('lists incidents with in-memory filters', async () => {
    const mockDb = createMockDb();
    const repo = createIncidentRepository({
      db: mockDb as never,
      fieldValue: { serverTimestamp: () => 'SERVER_TS' } as never,
      isBackedOff: () => false,
      onQuotaError: () => undefined,
      isQuotaError: () => false,
    });

    await repo.writeIncident({
      type: 'security_events',
      status: 'DETECTED',
      payload: {},
      tenantId: 't-1',
    });
    await repo.writeIncident({
      type: 'api_errors',
      status: 'RESOLVED',
      payload: {},
      tenantId: 't-2',
    });

    const detected = await repo.listIncidents({ status: 'DETECTED', limit: 10 });
    assert.equal(detected.length, 1);
    assert.equal(detected[0].type, 'security_events');
  });

  it('skips writes during Firestore quota backoff', async () => {
    const mockDb = createMockDb();
    let backedOff = true;
    const repo = createIncidentRepository({
      db: mockDb as never,
      fieldValue: { serverTimestamp: () => 'SERVER_TS' } as never,
      isBackedOff: () => backedOff,
      onQuotaError: () => undefined,
      isQuotaError: () => false,
    });

    const result = await repo.writeIncident({ type: 'system_errors', payload: {} });
    assert.equal(result.skipped, 'firestore_quota_backoff');
    assert.equal(mockDb.getIncidentStore().size, 0);

    backedOff = false;
    const ok = await repo.writeIncident({ type: 'system_errors', payload: {} });
    assert.ok(ok.incidentId);
    assert.equal(mockDb.getIncidentStore().size, 1);
  });

  it('exposes autopilot incident types and mirror set contract', () => {
    const autopilotTypes = getAutopilotIncidentTypes();
    assert.ok(autopilotTypes.includes('system_errors'));
    assert.ok(autopilotTypes.includes('merchant_blockers'));
    assert.ok(!autopilotTypes.includes('WEBHOOK_RECEIVED'));

    for (const type of ['system_errors', 'payment_incidents']) {
      assert.ok(CLIENT_ERROR_MIRROR_TYPES.has(type));
    }

    assert.ok(KNOWN_INCIDENT_TYPES.includes('api_errors'));
  });
});
