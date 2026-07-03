/**
 * DiscoverySDK — geoIndex repository retrieval service (M3 PR-7).
 */

import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { DiscoveryQuery } from '../dto/candidates';
import {
  dedupeGeoIndexEntries,
  extractTenantIdsFromGeoIndex,
  mapTenantsToStableDiscoveryCandidates,
  orderTenantsByIds,
} from './GeoIndexMapper';
import type {
  GeoIndexRepository,
  GeoIndexRepositoryDeps,
  GeoIndexRepositoryResult,
  GeoIndexRepositoryTelemetry,
} from './GeoIndexRepository';
import type { GeoIndexReadRecord } from './GeoIndexPort';
import { resolveCustomerGeohash } from './GeoHashPrefixResolver';
import {
  buildExpansionPrefixPlan,
  buildGeoIndexPrefixPlan,
  DEFAULT_GEOINDEX_STRATEGY,
} from './GeoIndexStrategy';

const pipelineNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

const createTimer = (): (() => number) => {
  const start = pipelineNow();
  return () => Math.max(0, pipelineNow() - start);
};

const emitTelemetry = (
  deps: GeoIndexRepositoryDeps,
  telemetry: GeoIndexRepositoryTelemetry
): void => {
  deps.hooks?.onTelemetry?.(telemetry);
};

const queryGeoIndexEntries = async (
  deps: GeoIndexRepositoryDeps,
  prefixes: readonly string[]
): Promise<{ readonly entries: GeoIndexReadRecord[]; readonly lookupMs: number }> => {
  if (!prefixes.length) {
    return { entries: [], lookupMs: 0 };
  }

  const timer = createTimer();
  const result = await deps.geoIndexPort.queryByPrefixes(prefixes);
  const lookupMs = timer();

  if (result.ok === false) {
    return { entries: [], lookupMs };
  }

  return {
    entries: dedupeGeoIndexEntries(result.value),
    lookupMs,
  };
};

const buildTelemetry = (
  partial: Omit<GeoIndexRepositoryTelemetry, 'returnedCount'> & { returnedCount?: number },
  candidates: readonly unknown[]
): GeoIndexRepositoryTelemetry => ({
  geoIndexLookupMs: partial.geoIndexLookupMs,
  tenantFetchMs: partial.tenantFetchMs,
  candidateCount: partial.candidateCount,
  returnedCount: partial.returnedCount ?? candidates.length,
  fallbackUsed: partial.fallbackUsed,
  fallbackReason: partial.fallbackReason,
  prefixesQueried: partial.prefixesQueried,
  tenantIdsMatched: partial.tenantIdsMatched,
});

export class DefaultGeoIndexRepository implements GeoIndexRepository {
  constructor(private readonly deps: GeoIndexRepositoryDeps) {}

  async getDiscoveryCandidates(
    query: DiscoveryQuery
  ): SdkAsyncResult<GeoIndexRepositoryResult> {
    const strategy = this.deps.strategy ?? DEFAULT_GEOINDEX_STRATEGY;
    const geohash = resolveCustomerGeohash(query);

    if (!geohash) {
      return this.resolveViaTenantScan(query, {
        geoIndexLookupMs: 0,
        tenantFetchMs: 0,
        candidateCount: 0,
        fallbackUsed: true,
        fallbackReason: 'unknown_geohash',
        prefixesQueried: [],
        tenantIdsMatched: 0,
      });
    }

    const primaryPrefixes = buildGeoIndexPrefixPlan(geohash, strategy);
    let lookup = await queryGeoIndexEntries(this.deps, primaryPrefixes);
    let prefixesQueried = [...primaryPrefixes];
    let tenantIds = extractTenantIdsFromGeoIndex(lookup.entries);

    if (tenantIds.length === 0) {
      const expansionPrefixes = buildExpansionPrefixPlan(geohash, strategy).filter(
        (prefix) => !prefixesQueried.includes(prefix)
      );

      if (expansionPrefixes.length > 0) {
        const expansionLookup = await queryGeoIndexEntries(this.deps, expansionPrefixes);
        lookup = {
          entries: dedupeGeoIndexEntries([...lookup.entries, ...expansionLookup.entries]),
          lookupMs: lookup.lookupMs + expansionLookup.lookupMs,
        };
        prefixesQueried = [...prefixesQueried, ...expansionPrefixes];
        tenantIds = extractTenantIdsFromGeoIndex(lookup.entries);
      }
    }

    if (tenantIds.length === 0) {
      return this.resolveViaTenantScan(query, {
        geoIndexLookupMs: lookup.lookupMs,
        tenantFetchMs: 0,
        candidateCount: 0,
        fallbackUsed: true,
        fallbackReason: 'empty_geoindex',
        prefixesQueried,
        tenantIdsMatched: 0,
      });
    }

    const tenantTimer = createTimer();
    const tenantsResult = await this.deps.tenantRepository.getTenantsByIds(tenantIds);
    const tenantFetchMs = tenantTimer();

    if (tenantsResult.ok === false) {
      return this.resolveViaTenantScan(query, {
        geoIndexLookupMs: lookup.lookupMs,
        tenantFetchMs,
        candidateCount: 0,
        fallbackUsed: true,
        fallbackReason: 'tenant_fetch_failed',
        prefixesQueried,
        tenantIdsMatched: tenantIds.length,
      });
    }

    const orderedTenants = orderTenantsByIds(tenantsResult.value, tenantIds);
    const candidates = mapTenantsToStableDiscoveryCandidates(orderedTenants);
    const telemetry = buildTelemetry(
      {
        geoIndexLookupMs: lookup.lookupMs,
        tenantFetchMs,
        candidateCount: candidates.length,
        fallbackUsed: false,
        prefixesQueried,
        tenantIdsMatched: tenantIds.length,
      },
      candidates
    );

    emitTelemetry(this.deps, telemetry);
    return sdkOk({ candidates, telemetry });
  }

  private async resolveViaTenantScan(
    query: DiscoveryQuery,
    partial: Omit<GeoIndexRepositoryTelemetry, 'returnedCount'>
  ): SdkAsyncResult<GeoIndexRepositoryResult> {
    const tenantTimer = createTimer();
    const tenantsResult = await this.deps.tenantRepository.listActiveTenants();
    const tenantFetchMs = partial.tenantFetchMs + tenantTimer();

    if (tenantsResult.ok === false) {
      return tenantsResult;
    }

    const candidates = mapTenantsToStableDiscoveryCandidates(tenantsResult.value);
    const telemetry = buildTelemetry(
      {
        ...partial,
        tenantFetchMs,
        candidateCount: candidates.length,
        fallbackUsed: true,
      },
      candidates
    );

    emitTelemetry(this.deps, telemetry);
    return sdkOk({ candidates, telemetry });
  }
}

export function createDefaultGeoIndexRepository(
  deps: GeoIndexRepositoryDeps
): GeoIndexRepository {
  return new DefaultGeoIndexRepository(deps);
}
