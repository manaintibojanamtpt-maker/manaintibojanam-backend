import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  compareOrderCanonicalModels,
  COMPARABLE_ORDER_PARITY_FIELDS,
  IGNORED_PARITY_METADATA_FIELDS,
} from '../OrderParityRules';
import {
  normalizeParityStatus,
  resolveParityTimestamp,
  normalizeParityLineItem,
  DEFAULT_PARITY_CURRENCY,
} from '../OrderCanonicalModel';
import {
  accumulateParityStatistics,
  EMPTY_ORDER_PARITY_STATISTICS,
} from '../OrderParityStatistics';
import { isParityMatch } from '../OrderParityResult';

const canonical = (overrides: Record<string, unknown> = {}) => ({
  orderId: 'order-001',
  tenantId: 'tenant-001',
  status: 'PENDING',
  customerId: 'user-001',
  currency: DEFAULT_PARITY_CURRENCY,
  totalAmount: 500,
  createdAt: '2026-06-26T20:00:00.000Z',
  updatedAt: '2026-06-26T20:00:00.000Z',
  version: '1.0.0',
  lineItems: [],
  ...overrides,
});

describe('Order parity domain (M6 PR-8)', () => {
  it('exports comparable and ignored field lists', () => {
    assert.ok(COMPARABLE_ORDER_PARITY_FIELDS.includes('lineItems'));
    assert.ok(IGNORED_PARITY_METADATA_FIELDS.includes('projectionVersion'));
    assert.ok(IGNORED_PARITY_METADATA_FIELDS.includes('checkpoint'));
  });

  it('normalizeParityStatus maps PLACED to PENDING', () => {
    assert.equal(normalizeParityStatus('PLACED'), 'PENDING');
    assert.equal(normalizeParityStatus('CONFIRMED'), 'CONFIRMED');
  });

  it('resolveParityTimestamp normalizes ISO strings', () => {
    const iso = resolveParityTimestamp('2026-06-26T20:00:00.000Z', 'fallback');
    assert.equal(iso, '2026-06-26T20:00:00.000Z');
  });

  it('normalizeParityLineItem fills defaults', () => {
    const item = normalizeParityLineItem({ menuItemId: 'a', name: 'Biryani', quantity: 2, lineTotal: 400 });
    assert.equal(item.lineTotal, 400);
  });

  it('compareOrderCanonicalModels returns MATCH for identical models', () => {
    const left = canonical();
    const right = canonical();
    const result = compareOrderCanonicalModels('order-001', left, right, '2026-06-26T21:00:00.000Z');
    assert.equal(result.outcome, 'MATCH');
    assert.equal(result.differences.length, 0);
    assert.equal(isParityMatch(result.outcome), true);
  });

  it('compareOrderCanonicalModels returns FIELD_MISMATCH for status drift', () => {
    const left = canonical();
    const right = canonical({ status: 'CANCELLED' });
    const result = compareOrderCanonicalModels('order-001', left, right, '2026-06-26T21:00:00.000Z');
    assert.equal(result.outcome, 'FIELD_MISMATCH');
    assert.ok(result.differences.some((d) => d.field === 'status'));
  });

  it('compareOrderCanonicalModels returns VERSION_MISMATCH', () => {
    const left = canonical();
    const right = canonical({ version: '2.0.0' });
    const result = compareOrderCanonicalModels('order-001', left, right, '2026-06-26T21:00:00.000Z');
    assert.equal(result.outcome, 'VERSION_MISMATCH');
  });

  it('compareOrderCanonicalModels returns MISSING_IN_PROJECTION', () => {
    const left = canonical();
    const result = compareOrderCanonicalModels('order-001', left, null, '2026-06-26T21:00:00.000Z');
    assert.equal(result.outcome, 'MISSING_IN_PROJECTION');
  });

  it('compareOrderCanonicalModels returns MISSING_IN_LEGACY', () => {
    const right = canonical();
    const result = compareOrderCanonicalModels('order-001', null, right, '2026-06-26T21:00:00.000Z');
    assert.equal(result.outcome, 'MISSING_IN_LEGACY');
  });

  it('compareOrderCanonicalModels detects line item mismatch', () => {
    const left = canonical({
      lineItems: [{ menuItemId: 'a', name: 'Thali', quantity: 1, lineTotal: 100 }],
    });
    const right = canonical({ lineItems: [] });
    const result = compareOrderCanonicalModels('order-001', left, right, '2026-06-26T21:00:00.000Z');
    assert.equal(result.outcome, 'FIELD_MISMATCH');
    assert.ok(result.differences.some((d) => d.field === 'lineItems.length'));
  });

  it('accumulateParityStatistics tracks outcomes', () => {
    let stats = { ...EMPTY_ORDER_PARITY_STATISTICS };
    stats = accumulateParityStatistics(stats, 'MATCH');
    stats = accumulateParityStatistics(stats, 'MISSING_IN_PROJECTION');
    assert.equal(stats.totalCompared, 2);
    assert.equal(stats.matched, 1);
    assert.equal(stats.missingInProjection, 1);
  });
});
