import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMPARABLE_MENU_PARITY_FIELDS,
  IGNORED_MENU_PARITY_METADATA_FIELDS,
  compareMenuCanonicalModels,
} from '../MenuParityRules';
import {
  normalizeMenuParityStatus,
  resolveMenuParityTimestamp,
  type MenuCanonicalModel,
} from '../MenuCanonicalModel';
import {
  accumulateMenuParityStatistics,
  summarizeMenuParityStatistics,
} from '../MenuParityStatistics';

const comparedAt = '2026-06-27T12:00:00.000Z';

const canonical = (overrides: Partial<MenuCanonicalModel> = {}): MenuCanonicalModel => ({
  catalogId: 'catalog-parity-001',
  tenantId: 'tenant-parity-001',
  branchId: 'branch-parity-001',
  catalogVersion: '1.0.0',
  status: 'ACTIVE',
  categoryCount: 4,
  itemCount: 20,
  modifierGroupCount: 3,
  comboCount: 2,
  updatedAt: '2026-06-27T10:00:00.000Z',
  ...overrides,
});

describe('Menu parity domain (M7 PR-8)', () => {
  it('exports comparable and ignored field lists', () => {
    assert.ok(COMPARABLE_MENU_PARITY_FIELDS.includes('catalogVersion'));
    assert.ok(IGNORED_MENU_PARITY_METADATA_FIELDS.includes('projectionVersion'));
  });

  it('normalizes status and timestamps', () => {
    assert.equal(normalizeMenuParityStatus('active'), 'ACTIVE');
    assert.equal(
      resolveMenuParityTimestamp('2026-06-27T10:00:00.000Z', comparedAt),
      '2026-06-27T10:00:00.000Z'
    );
  });

  it('returns MATCH for identical canonical models', () => {
    const model = canonical();
    const result = compareMenuCanonicalModels('catalog-parity-001', model, model, comparedAt);
    assert.equal(result.outcome, 'MATCH');
    assert.equal(result.differences.length, 0);
  });

  it('returns VERSION_MISMATCH when catalogVersion differs', () => {
    const legacy = canonical();
    const projection = canonical({ catalogVersion: '1.1.0' });
    const result = compareMenuCanonicalModels(
      'catalog-parity-001',
      legacy,
      projection,
      comparedAt
    );
    assert.equal(result.outcome, 'VERSION_MISMATCH');
  });

  it('returns FIELD_MISMATCH when status differs', () => {
    const legacy = canonical();
    const projection = canonical({ status: 'DRAFT' });
    const result = compareMenuCanonicalModels(
      'catalog-parity-001',
      legacy,
      projection,
      comparedAt
    );
    assert.equal(result.outcome, 'FIELD_MISMATCH');
  });

  it('returns MISSING_IN_PROJECTION when projection is null', () => {
    const result = compareMenuCanonicalModels(
      'catalog-parity-001',
      canonical(),
      null,
      comparedAt
    );
    assert.equal(result.outcome, 'MISSING_IN_PROJECTION');
  });

  it('returns MISSING_IN_LEGACY when legacy is null', () => {
    const result = compareMenuCanonicalModels(
      'catalog-parity-001',
      null,
      canonical(),
      comparedAt
    );
    assert.equal(result.outcome, 'MISSING_IN_LEGACY');
  });

  it('returns UNSUPPORTED when both sources are null', () => {
    const result = compareMenuCanonicalModels('catalog-parity-001', null, null, comparedAt);
    assert.equal(result.outcome, 'UNSUPPORTED');
  });

  it('accumulates statistics and computes summary percentages', () => {
    let stats = accumulateMenuParityStatistics(
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
    stats = accumulateMenuParityStatistics(stats, 'MISSING_IN_PROJECTION', 20);
    const summary = summarizeMenuParityStatistics(stats);
    assert.equal(summary.totalCompared, 2);
    assert.equal(summary.matchPercent, 50);
    assert.equal(summary.missingPercent, 50);
    assert.equal(summary.averageComparisonDurationMs, 15);
  });
});
