/**
 * BranchSDK — operations domain ↔ SDK mappers (M5 PR-12).
 * Pure mapping — no business rules.
 */

import type { BranchDayHours } from '../../../domain/branch/operations/BranchAvailabilitySummary';
import type {
  BranchAvailabilitySummary,
  BranchAvailabilitySummaryDisabled,
  BranchOperationsAvailabilityResult,
} from '../../../domain/branch/operations/BranchAvailabilitySummary';
import type { BranchOperationalSnapshot } from '../../../domain/branch/shared/BranchTypes';
import { DEFAULT_BRANCH_DELIVERY_ZONE } from '../adapters/BranchDomainMapper';
import type {
  BranchOperationsAvailabilityDto,
  BranchOperationsAvailabilityQuery,
} from '../dto/operations';
import type { BranchHoursSnapshot } from '../dto/hours';
import type { BranchOperationalSnapshotDto } from '../operations/BranchOperationsRepository';

export const parseBranchHoursTimeToMinutes = (time: string): number => {
  const [hoursPart, minutesPart] = time.split(':');
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
};

export const mapHoursSnapshotToWeeklyHours = (
  hours: BranchHoursSnapshot
): readonly BranchDayHours[] =>
  hours.rules
    .filter((rule) => !rule.isClosed)
    .map((rule) => ({
      dayOfWeek: rule.dayOfWeek,
      openMinute: parseBranchHoursTimeToMinutes(rule.openTime),
      closeMinute: parseBranchHoursTimeToMinutes(rule.closeTime),
    }));

export const mapOperationalSnapshotDtoToDomainSnapshot = (
  dto: BranchOperationalSnapshotDto,
  query: BranchOperationsAvailabilityQuery = { branchId: dto.branchId }
): BranchOperationalSnapshot => ({
  branchId: String(dto.branchId),
  tenantId: String(dto.tenantId),
  name: query.branchName ?? String(dto.branchId),
  status: query.branchStatus ?? 'active',
  isDefault: false,
  distanceKm: 0,
  deliveryZone: {
    maxRadiusKm: query.maxRadiusKm ?? DEFAULT_BRANCH_DELIVERY_ZONE.maxRadiusKm,
  },
  isOpen: dto.status.isOpen,
  isBusy: dto.status.isBusy,
  acceptingOrders: dto.capacity.acceptingOrders,
  congestionLevel: dto.capacity.congestionLevel,
  activeOrders: dto.capacity.activeOrders,
  maxConcurrentOrders: dto.capacity.maxConcurrentOrders,
  prepQueueMins: dto.capacity.prepQueueMins,
  unavailableMenuItemIds: dto.inventory.unavailableItemIds,
});

export const mapDisabledAvailabilityToDto = (
  disabled: BranchAvailabilitySummaryDisabled,
  capturedAt?: number
): BranchOperationsAvailabilityDto => ({
  branchId: disabled.branchId,
  enabled: false,
  isOperationallyAvailable: false,
  blockers: [],
  hours: { status: 'unknown', isOpen: false, reasons: [] },
  capacity: {
    status: 'unknown',
    isAvailable: false,
    activeOrders: 0,
    maxConcurrentOrders: 0,
    utilizationRatio: 0,
    reasons: [],
  },
  inventory: {
    status: 'not_applicable',
    isSufficient: true,
    requestedCount: 0,
    unavailableCount: 0,
    missingItemIds: [],
    reasons: [],
  },
  operationalStatus: {
    isActive: false,
    status: 'active',
    reasons: [],
  },
  evaluatedAt: disabled.evaluatedAt,
  capturedAt,
});

export const mapAvailabilitySummaryToDto = (
  summary: BranchAvailabilitySummary,
  capturedAt?: number
): BranchOperationsAvailabilityDto => ({
  branchId: summary.branchId as BranchOperationsAvailabilityDto['branchId'],
  enabled: true,
  isOperationallyAvailable: summary.isOperationallyAvailable,
  blockers: summary.blockers,
  hours: {
    status: summary.hours.status,
    isOpen: summary.hours.isOpen,
    reasons: summary.hours.reasons,
  },
  capacity: {
    status: summary.capacity.status,
    isAvailable: summary.capacity.isAvailable,
    activeOrders: summary.capacity.activeOrders,
    maxConcurrentOrders: summary.capacity.maxConcurrentOrders,
    utilizationRatio: summary.capacity.utilizationRatio,
    reasons: summary.capacity.reasons,
  },
  inventory: {
    status: summary.inventory.status,
    isSufficient: summary.inventory.isSufficient,
    requestedCount: summary.inventory.requestedCount,
    unavailableCount: summary.inventory.unavailableCount,
    missingItemIds: summary.inventory.missingItemIds,
    reasons: summary.inventory.reasons,
  },
  operationalStatus: {
    isActive: summary.operationalStatus.isActive,
    status: summary.operationalStatus.status,
    reasons: summary.operationalStatus.reasons,
  },
  evaluatedAt: summary.evaluatedAt,
  capturedAt,
});

export const mapOperationsAvailabilityResultToDto = (
  result: BranchOperationsAvailabilityResult,
  capturedAt?: number
): BranchOperationsAvailabilityDto => {
  if (!result.enabled) {
    return mapDisabledAvailabilityToDto(result.summary, capturedAt);
  }

  return mapAvailabilitySummaryToDto(result.summary, capturedAt);
};
