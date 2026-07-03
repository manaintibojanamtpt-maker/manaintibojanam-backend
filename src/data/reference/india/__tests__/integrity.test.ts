import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadIndiaReferenceBundle, INDIA_REFERENCE_BUNDLE_VERSION } from '../loadBundle';
import {
  assertValidIndiaReferenceBundle,
  validateIndiaReferenceBundle,
} from '../integrity';

describe('India Reference Data Bundle 2026.07 (M2 PR-4)', () => {
  const bundle = loadIndiaReferenceBundle();

  it('loads bundle version 2026.07', () => {
    assert.equal(INDIA_REFERENCE_BUNDLE_VERSION, '2026.07');
    assert.equal(bundle.manifest.bundleVersion, '2026.07');
  });

  it('passes full hierarchy integrity validation', () => {
    assertValidIndiaReferenceBundle(bundle);
  });

  it('has unique entity ids across all layers', () => {
    const report = validateIndiaReferenceBundle(bundle);
    const idIssues = report.issues.filter((i) => i.code === 'ID_DUPLICATE');
    assert.equal(idIssues.length, 0);
  });

  it('has valid parent references for every entity', () => {
    const report = validateIndiaReferenceBundle(bundle);
    const parentIssues = report.issues.filter((i) => i.code === 'PARENT_NOT_FOUND');
    assert.equal(parentIssues.length, 0);
  });

  it('includes all 36 states and union territories', () => {
    assert.equal(bundle.states.length, 36);
    const utCount = bundle.states.filter((s) => s.administrationType === 'union_territory').length;
    const stateCount = bundle.states.filter((s) => s.administrationType === 'state').length;
    assert.equal(utCount, 8);
    assert.equal(stateCount, 28);
  });

  it('includes canonical city aliases', () => {
    const bengaluru = bundle.cities.find((c) => c.id === 'ref-city-in-ka-bengaluru');
    assert.ok(bengaluru?.aliases?.includes('Bangalore'));

    const mumbai = bundle.cities.find((c) => c.id === 'ref-city-in-mh-mumbai');
    assert.ok(mumbai?.aliases?.includes('Bombay'));

    const prayagraj = bundle.cities.find((c) => c.id === 'ref-city-in-up-prayagraj');
    assert.ok(prayagraj?.aliases?.includes('Allahabad'));
  });

  it('manifest entity counts match loaded data', () => {
    const aliasEntries = [
      bundle.country,
      ...bundle.states,
      ...bundle.districts,
      ...bundle.cities,
      ...bundle.localities,
      ...bundle.pincodes,
    ].reduce((sum, entity) => sum + (entity.aliases?.length ?? 0), 0);

    assert.equal(bundle.manifest.entityCounts.countries, 1);
    assert.equal(bundle.manifest.entityCounts.states, bundle.states.length);
    assert.equal(bundle.manifest.entityCounts.districts, bundle.districts.length);
    assert.equal(bundle.manifest.entityCounts.cities, bundle.cities.length);
    assert.equal(bundle.manifest.entityCounts.localities, bundle.localities.length);
    assert.equal(bundle.manifest.entityCounts.pincodes, bundle.pincodes.length);
    assert.equal(bundle.manifest.entityCounts.aliasEntries, aliasEntries);
  });

  it('validates pincode format for all pincodes', () => {
    for (const pin of bundle.pincodes) {
      assert.match(pin.postalCode, /^[1-9][0-9]{5}$/);
      assert.equal(pin.officialCode, pin.postalCode);
    }
  });
});

describe('India Reference Bundle — negative integrity fixtures', () => {
  it('detects broken parent reference', () => {
    const bundle = loadIndiaReferenceBundle();
    const broken = {
      ...bundle,
      cities: [
        ...bundle.cities,
        {
          id: 'ref-city-in-broken',
          officialCode: 'BROKEN',
          displayName: 'Broken',
          parentId: 'ref-district-in-missing',
          active: true,
          kind: 'city' as const,
        },
      ],
    };
    const report = validateIndiaReferenceBundle(broken);
    assert.equal(report.valid, false);
    assert.ok(report.issues.some((i) => i.code === 'PARENT_NOT_FOUND'));
  });

  it('detects duplicate aliases', () => {
    const bundle = loadIndiaReferenceBundle();
    const broken = {
      ...bundle,
      cities: bundle.cities.map((city) =>
        city.id === 'ref-city-in-mh-pune'
          ? { ...city, aliases: ['Bangalore'] }
          : city
      ),
    };
    const report = validateIndiaReferenceBundle(broken);
    assert.equal(report.valid, false);
    assert.ok(report.issues.some((i) => i.code === 'ALIAS_DUPLICATE'));
  });
});
