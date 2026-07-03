/**
 * India Reference Data Bundle — hierarchy integrity validation (M2 PR-4).
 * Pure functions — no ReferenceSDK adapter, no I/O except via caller.
 */

import type {
  IndiaReferenceBundle,
  ReferenceBundleCity,
  ReferenceBundleCountry,
  ReferenceBundleDistrict,
  ReferenceBundleEntity,
  ReferenceBundleLocality,
  ReferenceBundlePincode,
  ReferenceBundleState,
} from './schema';

export interface IntegrityIssue {
  readonly code: string;
  readonly message: string;
  readonly entityId?: string;
}

export interface IntegrityReport {
  readonly valid: boolean;
  readonly issues: readonly IntegrityIssue[];
  readonly counts: {
    readonly ids: number;
    readonly officialCodes: number;
    readonly aliases: number;
  };
}

const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;

function issue(code: string, message: string, entityId?: string): IntegrityIssue {
  return { code, message, entityId };
}

function collectAliases(entities: readonly { id: string; aliases?: readonly string[] }[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const seen = new Map<string, string>();

  for (const entity of entities) {
    for (const alias of entity.aliases ?? []) {
      const normalized = alias.trim().toLowerCase();
      if (!normalized) {
        issues.push(issue('ALIAS_EMPTY', 'Alias must not be empty', entity.id));
        continue;
      }
      const prior = seen.get(normalized);
      if (prior && prior !== entity.id) {
        issues.push(
          issue(
            'ALIAS_DUPLICATE',
            `Alias "${alias}" is used by both ${prior} and ${entity.id}`,
            entity.id
          )
        );
      } else {
        seen.set(normalized, entity.id);
      }
    }
  }

  return issues;
}

function assertUniqueIds(
  entities: readonly ReferenceBundleEntity[],
  issues: IntegrityIssue[]
): void {
  const seen = new Set<string>();
  for (const entity of entities) {
    if (seen.has(entity.id)) {
      issues.push(issue('ID_DUPLICATE', `Duplicate id: ${entity.id}`, entity.id));
    }
    seen.add(entity.id);
  }
}

function assertUniqueOfficialCodesByKind(
  groups: ReadonlyArray<{ kind: string; entities: readonly ReferenceBundleEntity[]; allowDuplicateCodes?: boolean }>,
  issues: IntegrityIssue[]
): void {
  for (const group of groups) {
    if (group.allowDuplicateCodes) {
      continue;
    }
    const seen = new Set<string>();
    for (const entity of group.entities) {
      const key = entity.officialCode.trim().toUpperCase();
      if (seen.has(key)) {
        issues.push(
          issue(
            'OFFICIAL_CODE_DUPLICATE',
            `Duplicate officialCode "${entity.officialCode}" in ${group.kind}`,
            entity.id
          )
        );
      }
      seen.add(key);
    }
  }
}

function validateCountry(country: ReferenceBundleCountry, issues: IntegrityIssue[]): void {
  if (country.kind !== 'country') {
    issues.push(issue('KIND_MISMATCH', 'Country kind must be "country"', country.id));
  }
  if (country.parentId !== null) {
    issues.push(issue('COUNTRY_PARENT', 'Country parentId must be null', country.id));
  }
  if (country.isoCode !== 'IN') {
    issues.push(issue('COUNTRY_ISO', 'India bundle requires isoCode IN', country.id));
  }
}

function validateStates(
  states: readonly ReferenceBundleState[],
  countryId: string,
  issues: IntegrityIssue[]
): Map<string, ReferenceBundleState> {
  const map = new Map<string, ReferenceBundleState>();
  for (const state of states) {
    if (state.kind !== 'state') {
      issues.push(issue('KIND_MISMATCH', 'State kind must be "state"', state.id));
    }
    if (state.parentId !== countryId) {
      issues.push(
        issue(
          'PARENT_MISMATCH',
          `State ${state.id} parentId must be ${countryId}`,
          state.id
        )
      );
    }
    map.set(state.id, state);
  }
  return map;
}

function validateDistricts(
  districts: readonly ReferenceBundleDistrict[],
  states: Map<string, ReferenceBundleState>,
  issues: IntegrityIssue[]
): Map<string, ReferenceBundleDistrict> {
  const map = new Map<string, ReferenceBundleDistrict>();
  for (const district of districts) {
    if (district.kind !== 'district') {
      issues.push(issue('KIND_MISMATCH', 'District kind must be "district"', district.id));
    }
    if (!states.has(district.parentId)) {
      issues.push(
        issue(
          'PARENT_NOT_FOUND',
          `District ${district.id} parent state ${district.parentId} not found`,
          district.id
        )
      );
    }
    map.set(district.id, district);
  }
  return map;
}

function validateCities(
  cities: readonly ReferenceBundleCity[],
  districts: Map<string, ReferenceBundleDistrict>,
  issues: IntegrityIssue[]
): Map<string, ReferenceBundleCity> {
  const map = new Map<string, ReferenceBundleCity>();
  for (const city of cities) {
    if (city.kind !== 'city') {
      issues.push(issue('KIND_MISMATCH', 'City kind must be "city"', city.id));
    }
    if (!districts.has(city.parentId)) {
      issues.push(
        issue(
          'PARENT_NOT_FOUND',
          `City ${city.id} parent district ${city.parentId} not found`,
          city.id
        )
      );
    }
    map.set(city.id, city);
  }
  return map;
}

function validateLocalities(
  localities: readonly ReferenceBundleLocality[],
  cities: Map<string, ReferenceBundleCity>,
  issues: IntegrityIssue[]
): Map<string, ReferenceBundleLocality> {
  const map = new Map<string, ReferenceBundleLocality>();
  for (const locality of localities) {
    if (locality.kind !== 'locality') {
      issues.push(issue('KIND_MISMATCH', 'Locality kind must be "locality"', locality.id));
    }
    if (!cities.has(locality.parentId)) {
      issues.push(
        issue(
          'PARENT_NOT_FOUND',
          `Locality ${locality.id} parent city ${locality.parentId} not found`,
          locality.id
        )
      );
    }
    map.set(locality.id, locality);
  }
  return map;
}

function validatePincodes(
  pincodes: readonly ReferenceBundlePincode[],
  localities: Map<string, ReferenceBundleLocality>,
  issues: IntegrityIssue[]
): void {
  for (const pincode of pincodes) {
    if (pincode.kind !== 'pincode') {
      issues.push(issue('KIND_MISMATCH', 'Pincode kind must be "pincode"', pincode.id));
    }
    if (!localities.has(pincode.parentId)) {
      issues.push(
        issue(
          'PARENT_NOT_FOUND',
          `Pincode ${pincode.id} parent locality ${pincode.parentId} not found`,
          pincode.id
        )
      );
    }
    if (!PINCODE_PATTERN.test(pincode.postalCode)) {
      issues.push(
        issue(
          'PINCODE_FORMAT',
          `Invalid postalCode ${pincode.postalCode} on ${pincode.id}`,
          pincode.id
        )
      );
    }
    if (pincode.officialCode !== pincode.postalCode) {
      issues.push(
        issue(
          'PINCODE_CODE_MISMATCH',
          `officialCode must match postalCode on ${pincode.id}`,
          pincode.id
        )
      );
    }
  }
}

export function validateIndiaReferenceBundle(bundle: IndiaReferenceBundle): IntegrityReport {
  const issues: IntegrityIssue[] = [];

  const allEntities: ReferenceBundleEntity[] = [
    bundle.country,
    ...bundle.states,
    ...bundle.districts,
    ...bundle.cities,
    ...bundle.localities,
    ...bundle.pincodes,
  ];

  assertUniqueIds(allEntities, issues);
  assertUniqueOfficialCodesByKind(
    [
      { kind: 'country', entities: [bundle.country] },
      { kind: 'state', entities: bundle.states },
      { kind: 'district', entities: bundle.districts },
      { kind: 'city', entities: bundle.cities },
      { kind: 'locality', entities: bundle.localities },
      { kind: 'pincode', entities: bundle.pincodes, allowDuplicateCodes: true },
    ],
    issues
  );

  validateCountry(bundle.country, issues);
  const stateMap = validateStates(bundle.states, bundle.country.id, issues);
  const districtMap = validateDistricts(bundle.districts, stateMap, issues);
  const cityMap = validateCities(bundle.cities, districtMap, issues);
  const localityMap = validateLocalities(bundle.localities, cityMap, issues);
  validatePincodes(bundle.pincodes, localityMap, issues);

  issues.push(
    ...collectAliases(bundle.states),
    ...collectAliases(bundle.districts),
    ...collectAliases(bundle.cities),
    ...collectAliases(bundle.localities),
    ...collectAliases(bundle.pincodes)
  );

  const aliasCount = allEntities.reduce(
    (sum, entity) => sum + (entity.aliases?.length ?? 0),
    0
  );

  return {
    valid: issues.length === 0,
    issues,
    counts: {
      ids: allEntities.length,
      officialCodes: allEntities.length,
      aliases: aliasCount,
    },
  };
}

export function assertValidIndiaReferenceBundle(bundle: IndiaReferenceBundle): void {
  const report = validateIndiaReferenceBundle(bundle);
  if (!report.valid) {
    const summary = report.issues.map((i) => `${i.code}: ${i.message}`).join('\n');
    throw new Error(`India reference bundle integrity failed:\n${summary}`);
  }
}
