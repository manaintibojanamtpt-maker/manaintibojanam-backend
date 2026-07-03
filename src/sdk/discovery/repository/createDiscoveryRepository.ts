/**
 * DiscoverySDK — repository factory (M3 PR-3 / PR-7).
 */

import {
  readDiscoveryFlagDefault,
  type DiscoveryFeatureFlagReader,
} from '../core/featureFlags';
import type { DiscoveryRepository } from './DiscoveryRepository';
import type { CreateDiscoverySDKOptions } from '../shared/options';
import { createStubDiscoveryRepository } from './adapters/StubDiscoveryRepository';
import { createTenantDiscoveryRepositoryAdapter } from './adapters/TenantDiscoveryRepositoryAdapter';
import {
  createFirestoreTenantRepositoryAdapter,
  type FirestoreTenantReadPort,
} from './adapters/FirestoreTenantRepositoryAdapter';
import { createDefaultGeoIndexRepository } from './createGeoIndexRepository';
import { createGeoIndexRepositoryAdapter } from './GeoIndexRepositoryAdapter';
import type { TenantRepositoryPort } from './ports/TenantRepositoryPort';

export interface CreateDiscoveryRepositoryOptions extends CreateDiscoverySDKOptions {
  readonly tenantRepository?: TenantRepositoryPort;
  readonly firestoreTenantReadPort?: FirestoreTenantReadPort;
}

export function resolveGeoIndexEnabled(
  options?: CreateDiscoveryRepositoryOptions
): boolean {
  const readFlag: DiscoveryFeatureFlagReader =
    options?.featureFlags ?? readDiscoveryFlagDefault;

  return readFlag('FF_DISCOVERY_GEOINDEX_ENABLED');
}

export function createDiscoveryRepository(
  options: CreateDiscoveryRepositoryOptions = {}
): DiscoveryRepository {
  if (options.repository) {
    return options.repository;
  }

  const providerKind = options.providerKind ?? 'stub';
  if (providerKind !== 'tenant-scan') {
    return createStubDiscoveryRepository();
  }

  const tenantRepository =
    options.tenantRepository ??
    (options.firestoreTenantReadPort
      ? createFirestoreTenantRepositoryAdapter(options.firestoreTenantReadPort)
      : null);

  if (!tenantRepository) {
    return createStubDiscoveryRepository();
  }

  const fallbackRepository = createTenantDiscoveryRepositoryAdapter(tenantRepository, {
    branchReadPort: options.branchReadPort,
    featureFlags: options.branchFeatureFlags,
    onTelemetry: options.branchCandidateTelemetry,
  });

  if (!resolveGeoIndexEnabled(options) || !options.geoIndexPort) {
    return fallbackRepository;
  }

  const geoIndexRepository = createDefaultGeoIndexRepository({
    geoIndexPort: options.geoIndexPort,
    tenantRepository,
    hooks: options.geoIndexHooks,
  });

  return createGeoIndexRepositoryAdapter({
    geoIndexRepository,
    fallbackRepository,
  });
}

export function createDefaultTenantRepositoryPort(
  readPort: FirestoreTenantReadPort
): TenantRepositoryPort {
  return createFirestoreTenantRepositoryAdapter(readPort);
}
