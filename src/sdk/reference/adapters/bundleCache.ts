/**
 * ReferenceSDK — in-memory cache for loaded bundle + indexes.
 */

import type { IndiaReferenceBundle } from '../../../data/reference/india/schema';

export interface ReferenceBundleIndex {
  readonly bundle: IndiaReferenceBundle;
  readonly countriesById: ReadonlyMap<string, IndiaReferenceBundle['country']>;
  readonly statesById: ReadonlyMap<string, IndiaReferenceBundle['states'][number]>;
  readonly statesByCountryId: ReadonlyMap<string, IndiaReferenceBundle['states'][number][]>;
  readonly districtsById: ReadonlyMap<string, IndiaReferenceBundle['districts'][number]>;
  readonly districtsByStateId: ReadonlyMap<string, IndiaReferenceBundle['districts'][number][]>;
  readonly citiesById: ReadonlyMap<string, IndiaReferenceBundle['cities'][number]>;
  readonly citiesByDistrictId: ReadonlyMap<string, IndiaReferenceBundle['cities'][number][]>;
  readonly localitiesById: ReadonlyMap<string, IndiaReferenceBundle['localities'][number]>;
  readonly localitiesByCityId: ReadonlyMap<string, IndiaReferenceBundle['localities'][number][]>;
  readonly pincodesById: ReadonlyMap<string, IndiaReferenceBundle['pincodes'][number]>;
  readonly pincodesByLocalityId: ReadonlyMap<string, IndiaReferenceBundle['pincodes'][number][]>;
}

function groupByParent<T extends { parentId: string }>(
  items: readonly T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.parentId) ?? [];
    list.push(item);
    map.set(item.parentId, list);
  }
  return map;
}

export function buildReferenceBundleIndex(bundle: IndiaReferenceBundle): ReferenceBundleIndex {
  const countriesById = new Map<string, IndiaReferenceBundle['country']>([
    [bundle.country.id, bundle.country],
  ]);

  const statesById = new Map(bundle.states.map((s) => [s.id, s]));
  const districtsById = new Map(bundle.districts.map((d) => [d.id, d]));
  const citiesById = new Map(bundle.cities.map((c) => [c.id, c]));
  const localitiesById = new Map(bundle.localities.map((l) => [l.id, l]));
  const pincodesById = new Map(bundle.pincodes.map((p) => [p.id, p]));

  return {
    bundle,
    countriesById,
    statesById,
    districtsById,
    citiesById,
    localitiesById,
    pincodesById,
    statesByCountryId: groupByParent(bundle.states),
    districtsByStateId: groupByParent(bundle.districts),
    citiesByDistrictId: groupByParent(bundle.cities),
    localitiesByCityId: groupByParent(bundle.localities),
    pincodesByLocalityId: groupByParent(bundle.pincodes),
  };
}

let cachedIndex: ReferenceBundleIndex | null = null;
let cachedBundleVersion: string | null = null;

export function getCachedReferenceBundleIndex(): ReferenceBundleIndex | null {
  return cachedIndex;
}

export function setCachedReferenceBundleIndex(
  index: ReferenceBundleIndex,
  bundleVersion: string
): ReferenceBundleIndex {
  cachedIndex = index;
  cachedBundleVersion = bundleVersion;
  return index;
}

export function clearReferenceBundleCache(): void {
  cachedIndex = null;
  cachedBundleVersion = null;
}

export function getCachedReferenceBundleVersion(): string | null {
  return cachedBundleVersion;
}
