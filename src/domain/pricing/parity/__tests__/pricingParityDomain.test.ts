import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMPARABLE_PRICING_PARITY_FIELDS,
  IGNORED_PRICING_PARITY_METADATA_FIELDS,
  comparePricingCanonicalModels,
} from '../PricingParityRules';
import {
  normalizePricingParityStatus,
  resolvePricingParityTimestamp,
  type PricingCanonicalModel,
} from '../PricingCanonicalModel';
import {
  accumulatePricingParityStatistics,
  summarizePricingParityStatistics,
} from '../PricingParityStatistics';

const comparedAt = '2026-07-03T12:00:00.000Z';

const canonical = (overrides: Partial<PricingCanonicalModel> = {}): PricingCanonicalModel => ({
  priceListId: 'pricelist-parity-001',
  tenantId: 'tenant-parity-001',
  branchId: 'branch-parity-001',
  pricingVersion: '1.0.0',
  status: 'ACTIVE',
  priceCount: 42,
  couponCount: 3,
  campaignCount: 2,
  offerCount: 1,
  updatedAt: '2026-07-03T10:00:00.000Z',
  ...overrides,
});

describe('Pricing parity domain (M8 PR-8)', () => {
  it('exports comparable and ignored field lists', () => {
    assert.ok(COMPARABLE_PRICING_PARITY_FIELDS.includes('pricingVersion'));
    assert.ok(IGNORED_PRICING_PARITY_METADATA_FIELDS.includes('projectionVersion'));
    assert.ok(IGNORED_PRICING_PARITY_METADATA_FIELDS.includes('gst'));
  });

  it('normalizes status and timestamps', () => {
    assert.equal(normalizePricingParityStatus('active'), 'ACTIVE');
    assert.equal(
      resolvePricingParityTimestamp('2026-07-03T10:00:00.000Z', comparedAt),
      '2026-07-03T10:00:00.000Z'
    );
  });

  it('returns MATCH for identical canonical models', () => {
    const model = canonical();
    const result = comparePricingCanonicalModels('pricelist-parity-001', model, model, comparedAt);
    assert.equal(result.outcome, 'MATCH');
    assert.equal(result.differences.length, 0);
  });

  it('returns VERSION_MISMATCH when pricingVersion differs', () => {
    const legacy = canonical();
    const projection = canonical({ pricingVersion: '1.1.0' });
    const result = comparePricingCanonicalModels(
      'pricelist-parity-001',
      legacy,
      projection,
      comparedAt
    );
    assert.equal(result.outcome, 'VERSION_MISMATCH');
  });

  it('returns FIELD_MISMATCH when status differs', () => {
    const legacy = canonical();
    const projection = canonical({ status: 'DRAFT' });
    const result = comparePricingCanonicalModels(
      'pricelist-parity-001',
      legacy,
      projection,
      comparedAt
    );
    assert.equal(result.outcome, 'FIELD_MISMATCH');
  });

  it('returns MISSING_IN_PROJECTION when projection is null', () => {
    const result = comparePricingCanonicalModels(
      'pricelist-parity-001',
      canonical(),
      null,
      comparedAt
    );
    assert.equal(result.outcome, 'MISSING_IN_PROJECTION');
  });

  it('returns MISSING_IN_LEGACY when legacy is null', () => {
    const result = comparePricingCanonicalModels(
      'pricelist-parity-001',
      null,
      canonical(),
      comparedAt
    );
    assert.equal(result.outcome, 'MISSING_IN_LEGACY');
  });

  it('returns UNSUPPORTED when both sources are null', () => {
    const result = comparePricingCanonicalModels('pricelist-parity-001', null, null, comparedAt);
    assert.equal(result.outcome, 'UNSUPPORTED');
  });

  it('accumulates statistics and computes summary percentages', () => {
    let stats = accumulatePricingParityStatistics(
      {
        totalCompared: 0,
        matched: 0,
        mismatched: 0,
        missingInProjection: 0,
        missingInLegacy: 0,
        versionMismatches: 0,
        fieldMismatches: 0,
        unsupported: 0,
        totalDurationMs: 0,
      },
      'MATCH',
      10
    );
    stats = accumulatePricingParityStatistics(stats, 'MISSING_IN_PROJECTION', 20);
    const summary = summarizePricingParityStatistics(stats);
    assert.equal(summary.totalCompared, 2);
    assert.equal(summary.matchPercent, 50);
    assert.equal(summary.missingPercent, 50);
    assert.equal(summary.averageComparisonDurationMs, 15);
  });
});
