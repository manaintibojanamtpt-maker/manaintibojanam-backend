/**
 * BranchSDK — persistence record → DTO mappers (M5 PR-3).
 * Pure mapping — no I/O, no business logic.
 */

import type { TenantId } from '../../core/types';
import type { Geohash } from '../../discovery/types/branded';
import type {
  BranchCapacityRecord,
  BranchDetail,
  BranchHoursSnapshot,
  BranchInventorySnapshot,
  BranchListFilter,
  BranchRoutingPolicy,
  BranchStatusSnapshot,
  BranchSummary,
} from '../dto';
import type { BranchId } from '../types/branded';
import type {
  BranchCapacityDocumentRecord,
  BranchDocumentRecord,
  BranchHoursDocumentRecord,
  BranchInventoryDocumentRecord,
  BranchRoutingDocumentRecord,
  BranchStatusDocumentRecord,
} from './BranchPersistenceModels';
import type { BranchListPersistenceFilter } from './BranchRepositoryPorts';

const ACTIVE_BRANCH_STATUSES = new Set(['active']);

const toBranchId = (id: string): BranchId => id as BranchId;

export const mapBranchListFilterToPersistence = (
  filter: BranchListFilter
): BranchListPersistenceFilter => ({
  tenantId: filter.tenantId,
  status: filter.status,
  includeInactive: filter.includeInactive,
  limit: filter.limit,
});

export const isActiveBranchDocument = (record: BranchDocumentRecord): boolean =>
  ACTIVE_BRANCH_STATUSES.has(record.status);

export const filterBranchDocuments = (
  records: readonly BranchDocumentRecord[],
  filter: BranchListPersistenceFilter
): BranchDocumentRecord[] => {
  let filtered = records.filter((record) => record.tenantId === filter.tenantId);

  if (filter.status) {
    filtered = filtered.filter((record) => record.status === filter.status);
  } else if (!filter.includeInactive) {
    filtered = filtered.filter(isActiveBranchDocument);
  }

  const sorted = [...filtered].sort((left, right) => left.id.localeCompare(right.id));

  if (filter.limit !== undefined && filter.limit >= 0) {
    return sorted.slice(0, filter.limit);
  }

  return sorted;
};

export const mapBranchDocumentToSummary = (record: BranchDocumentRecord): BranchSummary => ({
  branchId: toBranchId(record.id),
  tenantId: record.tenantId as TenantId,
  name: record.name,
  slug: record.slug,
  status: record.status,
  isDefault: record.isDefault,
});

export const mapBranchDocumentToDetail = (record: BranchDocumentRecord): BranchDetail => ({
  ...mapBranchDocumentToSummary(record),
  location: {
    point: record.coordinates ?? { lat: 0, lng: 0 },
    geohash: record.geohash as Geohash | undefined,
    formattedAddress: record.formattedAddress,
  },
  deliveryConfigId: record.deliveryConfigId,
});

export const mapBranchCapacityDocument = (
  record: BranchCapacityDocumentRecord
): BranchCapacityRecord => ({
  branchId: toBranchId(record.branchId),
  tenantId: record.tenantId,
  activeOrders: record.activeOrders,
  maxConcurrentOrders: record.maxConcurrentOrders,
  prepQueueMins: record.prepQueueMins,
  congestionLevel: record.congestionLevel,
  acceptingOrders: record.acceptingOrders,
  capturedAt: record.updatedAt ?? 0,
});

export const mapBranchInventoryDocument = (
  record: BranchInventoryDocumentRecord
): BranchInventorySnapshot => {
  const unavailableItemIds = record.items
    .filter((item) => !item.isAvailable)
    .map((item) => item.menuItemId);

  return {
    branchId: toBranchId(record.branchId),
    items: record.items.map((item) => ({
      menuItemId: item.menuItemId,
      available: item.isAvailable,
      quantity: item.quantity,
    })),
    unavailableItemIds,
    capturedAt: record.updatedAt ?? 0,
  };
};

export const mapBranchHoursDocument = (record: BranchHoursDocumentRecord): BranchHoursSnapshot => ({
  branchId: toBranchId(record.branchId),
  rules: record.rules.map((rule) => ({
    dayOfWeek: rule.dayOfWeek,
    openTime: rule.openTime,
    closeTime: rule.closeTime,
    isClosed: rule.isClosed,
  })),
  exceptions: record.exceptions?.map((exception) => ({
    date: exception.date,
    isClosed: exception.isClosed,
    openTime: exception.openTime,
    closeTime: exception.closeTime,
    label: exception.label,
  })),
  timezone: record.timezone,
});

export const mapBranchStatusDocument = (record: BranchStatusDocumentRecord): BranchStatusSnapshot => ({
  branchId: toBranchId(record.branchId),
  tenantId: record.tenantId,
  isOpen: record.isOpen,
  isBusy: record.isBusy,
  kitchenState: record.kitchenState,
  manualOverride: record.manualOverride,
  updatedAt: record.updatedAt,
});

export const mapBranchRoutingDocument = (record: BranchRoutingDocumentRecord): BranchRoutingPolicy => ({
  tenantId: record.tenantId,
  scoringWeights: {
    distance: record.scoringWeights.distance,
    eta: record.scoringWeights.eta,
    deliveryFee: record.scoringWeights.deliveryFee,
    capacityHeadroom: record.scoringWeights.capacityHeadroom,
    inventoryAvailability: record.scoringWeights.inventoryAvailability,
    openStatus: record.scoringWeights.openStatus,
  },
  failoverPolicy: {
    enabled: record.failoverPolicy.enabled,
    maxAttempts: record.failoverPolicy.maxAttempts,
    preferSameZone: record.failoverPolicy.preferSameZone,
  },
  autoSelectEnabled: record.autoSelectEnabled,
  schemaVersion: record.schemaVersion,
});
