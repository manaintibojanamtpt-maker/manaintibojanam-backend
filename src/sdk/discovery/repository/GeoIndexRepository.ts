/**
 * DiscoverySDK — geoIndex repository types and retrieval service (M3 PR-7).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { DiscoveryCandidate, DiscoveryQuery } from '../dto/candidates';
import type { GeoIndexPort } from './GeoIndexPort';
import type { GeoIndexStrategyOptions } from './GeoIndexStrategy';
import type { TenantRepositoryPort } from './ports/TenantRepositoryPort';

export interface GeoIndexRepositoryTelemetry {
  readonly geoIndexLookupMs: number;
  readonly tenantFetchMs: number;
  readonly candidateCount: number;
  readonly returnedCount: number;
  readonly fallbackUsed: boolean;
  readonly fallbackReason?: string;
  readonly prefixesQueried: readonly string[];
  readonly tenantIdsMatched: number;
}

export interface GeoIndexRepositoryHooks {
  readonly onTelemetry?: (telemetry: GeoIndexRepositoryTelemetry) => void;
}

export interface GeoIndexRepositoryDeps {
  readonly geoIndexPort: GeoIndexPort;
  readonly tenantRepository: TenantRepositoryPort;
  readonly strategy?: GeoIndexStrategyOptions;
  readonly hooks?: GeoIndexRepositoryHooks;
}

export interface GeoIndexRepositoryResult {
  readonly candidates: DiscoveryCandidate[];
  readonly telemetry: GeoIndexRepositoryTelemetry;
}

export interface GeoIndexRepository {
  getDiscoveryCandidates(query: DiscoveryQuery): SdkAsyncResult<GeoIndexRepositoryResult>;
}
