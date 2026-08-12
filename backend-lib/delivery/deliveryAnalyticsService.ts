/**
 * Phase 5 — STEP 17: Delivery Analytics & SLA Telemetry Service
 *
 * Provides a read-oriented, observational analytics layer measuring delivery performance,
 * ETA accuracy, SLA compliance, provider telemetry, and internal financial aggregates.
 *
 * CRITICAL SAFETY RULES:
 *  1. OBSERVATIONAL ONLY — NO operational feedback loops. Analytics output NEVER feeds
 *     back into PricingEngine, EtaEngine, PrepEngine, RouteEngine, DeliveryDecision,
 *     Provider Selection, Dispatch Orchestration, Checkout, Customer Fees, or Subsidies.
 *  2. STRICT TENANT ISOLATION — Every analytics computation is tenant-scoped. Tenant A
 *     data NEVER includes Tenant B data.
 *  3. IMMUTABILITY — Pure calculation functions. Does NOT mutate order documents, snapshots,
 *     runtimes, or configurations.
 *  4. FINANCIAL PRIVACY — Internal financial metrics (projectedDeliveryCost, tenantSubsidy,
 *     providerCost) MUST NOT be exposed in customer-facing analytics payloads.
 *  5. SECRET SAFETY — No API keys, credentials, tokens, or PII in analytics payloads.
 *  6. ZERO NETWORK REQUESTS — Analytics operates strictly on supplied historical evidence.
 */

import type { OrderDeliverySnapshot } from './deliverySnapshotModel.js';
import type { OrderDeliveryRuntime } from './deliveryRuntimeEngine.js';
import type { DeliveryProviderId } from './providerCapabilityMatrix.js';
import type { EtaLifecycleEvidence } from './etaEngine.js';

export interface DeliveryAnalyticsInputRecord {
  readonly tenantId: string;
  readonly orderId: string;
  readonly createdAt?: string;
  readonly status?: string;
  readonly delivery?: OrderDeliverySnapshot;
  readonly deliveryRuntime?: OrderDeliveryRuntime;
  readonly orderAcceptedAt?: string;
  readonly preparationStartedAt?: string;
  readonly preparationCompletedAt?: string;
  readonly partnerAssignedAt?: string;
  readonly partnerArrivedAtKitchenAt?: string;
  readonly pickedUpAt?: string;
  readonly onRouteAt?: string;
  readonly deliveredAt?: string;
  readonly cancelledAt?: string;
  readonly slaTargetMinutes?: number | null;
}

export interface SingleOrderDeliveryAnalytics {
  readonly tenantId: string;
  readonly orderId: string;
  readonly status: string;
  readonly isServiceable: boolean;
  readonly providerId: DeliveryProviderId | 'self_pickup' | 'none';
  readonly providerQuoteStatus: 'QUOTED' | 'EXPIRED' | 'UNAVAILABLE' | 'BLOCKED' | 'PENDING' | 'NOT_CONFIGURED' | 'NONE';
  readonly isManualFallback: boolean;

  // Timestamps
  readonly orderAcceptedAt: string | null;
  readonly preparationStartedAt: string | null;
  readonly preparationCompletedAt: string | null;
  readonly partnerAssignedAt: string | null;
  readonly partnerArrivedAtKitchenAt: string | null;
  readonly pickedUpAt: string | null;
  readonly onRouteAt: string | null;
  readonly deliveredAt: string | null;
  readonly cancelledAt: string | null;

  // Durations (Minutes)
  readonly preparationDurationMinutes: number | null;
  readonly dispatchLatencyMinutes: number | null;
  readonly providerAssignmentLatencyMinutes: number | null;
  readonly pickupHandlingDurationMinutes: number | null;
  readonly deliveryTravelDurationMinutes: number | null;
  readonly actualFulfillmentDurationMinutes: number | null;

  // ETA Accuracy
  readonly promisedEtaMinutes: number | null;
  readonly signedEtaErrorMinutes: number | null;
  readonly absoluteEtaErrorMinutes: number | null;
  readonly etaAccuracyStatus: 'ACCURATE' | 'OVERESTIMATED' | 'UNDERESTIMATED' | 'UNKNOWN';

  // SLA
  readonly slaTargetMinutes: number | null;
  readonly slaStatus: 'ON_TIME' | 'LATE' | 'UNKNOWN';
  readonly slaDetail: string;

  // Financial Metrics (Internal Tenant Admin ONLY)
  readonly customerDeliveryFee: number | null;
  readonly projectedDeliveryCost: number | null;
  readonly tenantSubsidy: number | null;
  readonly providerDeliveryCost: number | null;
}

export interface DeliveryAnalyticsQueryFilters {
  readonly tenantId: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly providerId?: DeliveryProviderId | 'self_pickup';
  readonly status?: string;
}

export interface AggregatedDeliveryAnalytics {
  readonly tenantId: string;
  readonly filterDateRange?: { readonly startDate?: string; readonly endDate?: string };
  readonly totalOrders: number;
  readonly completedOrders: number;
  readonly cancelledOrders: number;
  readonly serviceableOrders: number;
  readonly unserviceableOrders: number;

  // Averages (Only computed over non-null authoritative samples)
  readonly averagePreparationMinutes: number | null;
  readonly averageDispatchLatencyMinutes: number | null;
  readonly averageTravelMinutes: number | null;
  readonly averageActualFulfillmentMinutes: number | null;
  readonly averagePromisedEtaMinutes: number | null;
  readonly averageSignedEtaErrorMinutes: number | null;
  readonly averageAbsoluteEtaErrorMinutes: number | null;

  // Sample Counts
  readonly preparationSampleCount: number;
  readonly dispatchSampleCount: number;
  readonly travelSampleCount: number;
  readonly actualFulfillmentSampleCount: number;
  readonly etaAccuracySampleCount: number;

  // SLA Aggregates
  readonly slaOnTimeCount: number;
  readonly slaLateCount: number;
  readonly slaUnknownCount: number;

  // Provider Telemetry
  readonly providerQuoteSuccessCount: number;
  readonly providerQuoteExpiredCount: number;
  readonly providerFailureCount: number;
  readonly manualFallbackCount: number;

  // Financial Aggregates (Internal Tenant Admin ONLY)
  readonly totalCustomerDeliveryFees: number;
  readonly totalProjectedDeliveryCost: number | null;
  readonly totalTenantSubsidy: number | null;
  readonly totalProviderCost: number | null;
}

/** Customer-facing analytics summary with internal financials cleanly stripped. */
export type CustomerFacingDeliveryAnalytics = Omit<
  AggregatedDeliveryAnalytics,
  | 'totalProjectedDeliveryCost'
  | 'totalTenantSubsidy'
  | 'totalProviderCost'
>;

function parseTimestampMs(isoString?: string | null): number | null {
  if (!isoString || typeof isoString !== 'string') return null;
  const ms = Date.parse(isoString);
  return Number.isFinite(ms) ? ms : null;
}

function computeDurationMinutes(startIso?: string | null, endIso?: string | null): number | null {
  const startMs = parseTimestampMs(startIso);
  const endMs = parseTimestampMs(endIso);
  if (startMs === null || endMs === null) return null;
  const diffMs = endMs - startMs;
  if (diffMs < 0) return 0; // Guard against inverted clock skew
  return Math.round((diffMs / 60000) * 100) / 100;
}

function resolveLifecycleEvidenceTimestamp(
  record: DeliveryAnalyticsInputRecord,
  key: keyof EtaLifecycleEvidence,
): string | null {
  // 1. Direct record property
  const direct = record[key as keyof DeliveryAnalyticsInputRecord];
  if (typeof direct === 'string' && direct.length > 0) return direct;

  // 2. Runtime evidence property
  const runtimeEvidence = record.deliveryRuntime?.evidence;
  if (runtimeEvidence && typeof runtimeEvidence[key] === 'string') {
    return runtimeEvidence[key] as string;
  }

  return null;
}

/**
 * Computes single-order analytics from authoritative snapshot, runtime, and lifecycle timestamps.
 */
export function computeSingleOrderAnalytics(
  record: DeliveryAnalyticsInputRecord,
  authoritativeTenantId: string,
): SingleOrderDeliveryAnalytics {
  if (!authoritativeTenantId || record.tenantId !== authoritativeTenantId) {
    throw new Error(`Tenant isolation violation: record tenantId '${record.tenantId}' does not match authoritative tenant '${authoritativeTenantId}'`);
  }

  const snapshot = record.delivery;
  const runtime = record.deliveryRuntime;
  const status = String(record.status || runtime?.lifecyclePhase || 'PLACED').toUpperCase();

  // Authoritative timestamps
  const orderAcceptedAt = resolveLifecycleEvidenceTimestamp(record, 'orderAcceptedAt') || record.createdAt || null;
  const preparationStartedAt = resolveLifecycleEvidenceTimestamp(record, 'preparationStartedAt');
  const preparationCompletedAt = resolveLifecycleEvidenceTimestamp(record, 'preparationCompletedAt');
  const partnerAssignedAt = resolveLifecycleEvidenceTimestamp(record, 'partnerAssignedAt');
  const partnerArrivedAtKitchenAt = resolveLifecycleEvidenceTimestamp(record, 'partnerArrivedAtKitchenAt');
  const pickedUpAt = resolveLifecycleEvidenceTimestamp(record, 'pickedUpAt');
  const onRouteAt = resolveLifecycleEvidenceTimestamp(record, 'onRouteAt');
  const deliveredAt = resolveLifecycleEvidenceTimestamp(record, 'deliveredAt');
  const cancelledAt = record.cancelledAt || null;

  // Serviceability
  const isServiceable = snapshot?.serviceability?.isServiceable ?? true;

  // Provider
  const providerId: DeliveryProviderId | 'self_pickup' | 'none' =
    runtime?.currentProvider?.providerId ||
    snapshot?.providerQuote?.provider ||
    (snapshot as any)?.provider ||
    'none';

  const providerQuoteStatus: SingleOrderDeliveryAnalytics['providerQuoteStatus'] =
    runtime?.currentProvider?.quoteStatus ||
    snapshot?.providerQuote?.status ||
    (snapshot as any)?.providerQuote?.status ||
    'NONE';

  const isManualFallback = runtime?.isManualFallback ?? (providerId === 'self_pickup');

  // Durations
  const preparationDurationMinutes = computeDurationMinutes(preparationStartedAt, preparationCompletedAt);
  const dispatchLatencyMinutes = computeDurationMinutes(orderAcceptedAt, partnerAssignedAt);
  const providerAssignmentLatencyMinutes = computeDurationMinutes(orderAcceptedAt, partnerAssignedAt);
  const pickupHandlingDurationMinutes = computeDurationMinutes(partnerArrivedAtKitchenAt, pickedUpAt);
  const deliveryTravelDurationMinutes = computeDurationMinutes(pickedUpAt || onRouteAt, deliveredAt);
  const actualFulfillmentDurationMinutes = computeDurationMinutes(orderAcceptedAt, deliveredAt);

  // Promised ETA
  let promisedEtaMinutes: number | null = null;
  if (snapshot?.eta) {
    if (typeof snapshot.eta.displayMinutes === 'number') {
      promisedEtaMinutes = snapshot.eta.displayMinutes;
    } else if (typeof snapshot.eta.minMinutes === 'number' && typeof snapshot.eta.maxMinutes === 'number') {
      promisedEtaMinutes = Math.round((snapshot.eta.minMinutes + snapshot.eta.maxMinutes) / 2);
    }
  } else if (runtime?.currentEta) {
    if (typeof runtime.currentEta.displayMinutes === 'number') {
      promisedEtaMinutes = runtime.currentEta.displayMinutes;
    } else if (typeof runtime.currentEta.minMinutes === 'number' && typeof runtime.currentEta.maxMinutes === 'number') {
      promisedEtaMinutes = Math.round((runtime.currentEta.minMinutes + runtime.currentEta.maxMinutes) / 2);
    }
  }

  // ETA Accuracy
  let signedEtaErrorMinutes: number | null = null;
  let absoluteEtaErrorMinutes: number | null = null;
  let etaAccuracyStatus: SingleOrderDeliveryAnalytics['etaAccuracyStatus'] = 'UNKNOWN';

  if (actualFulfillmentDurationMinutes !== null && promisedEtaMinutes !== null) {
    signedEtaErrorMinutes = Math.round((actualFulfillmentDurationMinutes - promisedEtaMinutes) * 100) / 100;
    absoluteEtaErrorMinutes = Math.abs(signedEtaErrorMinutes);
    if (Math.abs(signedEtaErrorMinutes) <= 5) {
      etaAccuracyStatus = 'ACCURATE';
    } else if (signedEtaErrorMinutes < -5) {
      etaAccuracyStatus = 'OVERESTIMATED'; // Delivered faster than promised
    } else {
      etaAccuracyStatus = 'UNDERESTIMATED'; // Delivered slower than promised
    }
  }

  // SLA Status
  const slaTargetMinutes = record.slaTargetMinutes ?? (snapshot as any)?.slaTargetMinutes ?? null;
  let slaStatus: SingleOrderDeliveryAnalytics['slaStatus'] = 'UNKNOWN';
  let slaDetail = 'No authoritative SLA target configured.';

  if (slaTargetMinutes === null) {
    slaStatus = 'UNKNOWN';
    slaDetail = 'No authoritative SLA target configured.';
  } else if (actualFulfillmentDurationMinutes === null) {
    slaStatus = 'UNKNOWN';
    slaDetail = 'Actual fulfillment duration unavailable.';
  } else if (actualFulfillmentDurationMinutes <= slaTargetMinutes) {
    slaStatus = 'ON_TIME';
    slaDetail = `Delivered in ${actualFulfillmentDurationMinutes} min (within ${slaTargetMinutes} min SLA target).`;
  } else {
    slaStatus = 'LATE';
    slaDetail = `Delivered in ${actualFulfillmentDurationMinutes} min (exceeded ${slaTargetMinutes} min SLA target).`;
  }

  // Financial Metrics (Preserve canonical snapshot values without recomputing)
  const customerDeliveryFee = snapshot?.pricing?.customerDeliveryFee ?? null;
  const projectedDeliveryCost = snapshot?.pricing?.projectedDeliveryCost ?? null;
  const tenantSubsidy = snapshot?.pricing?.tenantSubsidy ?? snapshot?.subsidy?.tenantSubsidy ?? null;
  const providerDeliveryCost = snapshot?.providerQuote?.cost ?? null;

  return {
    tenantId: authoritativeTenantId,
    orderId: record.orderId,
    status,
    isServiceable,
    providerId,
    providerQuoteStatus,
    isManualFallback,
    orderAcceptedAt,
    preparationStartedAt,
    preparationCompletedAt,
    partnerAssignedAt,
    partnerArrivedAtKitchenAt,
    pickedUpAt,
    onRouteAt,
    deliveredAt,
    cancelledAt,
    preparationDurationMinutes,
    dispatchLatencyMinutes,
    providerAssignmentLatencyMinutes,
    pickupHandlingDurationMinutes,
    deliveryTravelDurationMinutes,
    actualFulfillmentDurationMinutes,
    promisedEtaMinutes,
    signedEtaErrorMinutes,
    absoluteEtaErrorMinutes,
    etaAccuracyStatus,
    slaTargetMinutes,
    slaStatus,
    slaDetail,
    customerDeliveryFee,
    projectedDeliveryCost,
    tenantSubsidy,
    providerDeliveryCost,
  };
}

/**
 * Computes deterministic aggregated delivery analytics across multiple tenant order records.
 */
export function aggregateDeliveryAnalytics(
  records: readonly DeliveryAnalyticsInputRecord[],
  filters: DeliveryAnalyticsQueryFilters,
): AggregatedDeliveryAnalytics {
  const { tenantId, startDate, endDate, providerId: filterProviderId, status: filterStatus } = filters;

  if (!tenantId) {
    throw new Error('aggregateDeliveryAnalytics requires an authoritative tenantId');
  }

  const startMs = parseTimestampMs(startDate);
  const endMs = parseTimestampMs(endDate);

  const singleAnalyticsList: SingleOrderDeliveryAnalytics[] = [];

  for (const record of records) {
    // 1. Strict Tenant Isolation
    if (record.tenantId !== tenantId) continue;

    // 2. Date Range Filter
    const orderMs = parseTimestampMs(record.createdAt || record.orderAcceptedAt);
    if (startMs !== null && (orderMs === null || orderMs < startMs)) continue;
    if (endMs !== null && (orderMs === null || orderMs > endMs)) continue;

    const single = computeSingleOrderAnalytics(record, tenantId);

    // 3. Provider Filter
    if (filterProviderId && single.providerId !== filterProviderId) continue;

    // 4. Status Filter
    if (filterStatus && single.status !== filterStatus.toUpperCase()) continue;

    singleAnalyticsList.push(single);
  }

  const totalOrders = singleAnalyticsList.length;
  let completedOrders = 0;
  let cancelledOrders = 0;
  let serviceableOrders = 0;
  let unserviceableOrders = 0;

  // Metric sums and sample counters
  let prepSum = 0;
  let prepCount = 0;

  let dispatchSum = 0;
  let dispatchCount = 0;

  let travelSum = 0;
  let travelCount = 0;

  let actualFulfillmentSum = 0;
  let actualFulfillmentCount = 0;

  let promisedEtaSum = 0;
  let promisedEtaCount = 0;

  let signedEtaErrorSum = 0;
  let absoluteEtaErrorSum = 0;
  let etaAccuracyCount = 0;

  let slaOnTimeCount = 0;
  let slaLateCount = 0;
  let slaUnknownCount = 0;

  let providerQuoteSuccessCount = 0;
  let providerQuoteExpiredCount = 0;
  let providerFailureCount = 0;
  let manualFallbackCount = 0;

  let totalCustomerDeliveryFees = 0;
  let totalProjectedDeliveryCostSum = 0;
  let hasProjectedCostSample = false;

  let totalTenantSubsidySum = 0;
  let hasSubsidySample = false;

  let totalProviderCostSum = 0;
  let hasProviderCostSample = false;

  for (const item of singleAnalyticsList) {
    if (item.status === 'DELIVERED') completedOrders++;
    if (item.status === 'CANCELLED') cancelledOrders++;

    if (item.isServiceable) serviceableOrders++;
    else unserviceableOrders++;

    if (item.preparationDurationMinutes !== null) {
      prepSum += item.preparationDurationMinutes;
      prepCount++;
    }

    if (item.dispatchLatencyMinutes !== null) {
      dispatchSum += item.dispatchLatencyMinutes;
      dispatchCount++;
    }

    if (item.deliveryTravelDurationMinutes !== null) {
      travelSum += item.deliveryTravelDurationMinutes;
      travelCount++;
    }

    if (item.actualFulfillmentDurationMinutes !== null) {
      actualFulfillmentSum += item.actualFulfillmentDurationMinutes;
      actualFulfillmentCount++;
    }

    if (item.promisedEtaMinutes !== null) {
      promisedEtaSum += item.promisedEtaMinutes;
      promisedEtaCount++;
    }

    if (item.signedEtaErrorMinutes !== null && item.absoluteEtaErrorMinutes !== null) {
      signedEtaErrorSum += item.signedEtaErrorMinutes;
      absoluteEtaErrorSum += item.absoluteEtaErrorMinutes;
      etaAccuracyCount++;
    }

    if (item.slaStatus === 'ON_TIME') slaOnTimeCount++;
    else if (item.slaStatus === 'LATE') slaLateCount++;
    else slaUnknownCount++;

    if (item.isManualFallback) manualFallbackCount++;

    if (item.providerQuoteStatus === 'QUOTED') providerQuoteSuccessCount++;
    else if (item.providerQuoteStatus === 'EXPIRED') providerQuoteExpiredCount++;
    else if (item.providerQuoteStatus === 'UNAVAILABLE' || item.providerQuoteStatus === 'BLOCKED') providerFailureCount++;

    if (typeof item.customerDeliveryFee === 'number') {
      totalCustomerDeliveryFees += item.customerDeliveryFee;
    }

    if (typeof item.projectedDeliveryCost === 'number') {
      totalProjectedDeliveryCostSum += item.projectedDeliveryCost;
      hasProjectedCostSample = true;
    }

    if (typeof item.tenantSubsidy === 'number') {
      totalTenantSubsidySum += item.tenantSubsidy;
      hasSubsidySample = true;
    }

    if (typeof item.providerDeliveryCost === 'number') {
      totalProviderCostSum += item.providerDeliveryCost;
      hasProviderCostSample = true;
    }
  }

  const roundTwo = (v: number) => Math.round(v * 100) / 100;

  return {
    tenantId,
    ...(startDate || endDate ? { filterDateRange: { startDate, endDate } } : {}),
    totalOrders,
    completedOrders,
    cancelledOrders,
    serviceableOrders,
    unserviceableOrders,

    averagePreparationMinutes: prepCount > 0 ? roundTwo(prepSum / prepCount) : null,
    averageDispatchLatencyMinutes: dispatchCount > 0 ? roundTwo(dispatchSum / dispatchCount) : null,
    averageTravelMinutes: travelCount > 0 ? roundTwo(travelSum / travelCount) : null,
    averageActualFulfillmentMinutes: actualFulfillmentCount > 0 ? roundTwo(actualFulfillmentSum / actualFulfillmentCount) : null,
    averagePromisedEtaMinutes: promisedEtaCount > 0 ? roundTwo(promisedEtaSum / promisedEtaCount) : null,
    averageSignedEtaErrorMinutes: etaAccuracyCount > 0 ? roundTwo(signedEtaErrorSum / etaAccuracyCount) : null,
    averageAbsoluteEtaErrorMinutes: etaAccuracyCount > 0 ? roundTwo(absoluteEtaErrorSum / etaAccuracyCount) : null,

    preparationSampleCount: prepCount,
    dispatchSampleCount: dispatchCount,
    travelSampleCount: travelCount,
    actualFulfillmentSampleCount: actualFulfillmentCount,
    etaAccuracySampleCount: etaAccuracyCount,

    slaOnTimeCount,
    slaLateCount,
    slaUnknownCount,

    providerQuoteSuccessCount,
    providerQuoteExpiredCount,
    providerFailureCount,
    manualFallbackCount,

    totalCustomerDeliveryFees: roundTwo(totalCustomerDeliveryFees),
    totalProjectedDeliveryCost: hasProjectedCostSample ? roundTwo(totalProjectedDeliveryCostSum) : null,
    totalTenantSubsidy: hasSubsidySample ? roundTwo(totalTenantSubsidySum) : null,
    totalProviderCost: hasProviderCostSample ? roundTwo(totalProviderCostSum) : null,
  };
}

/**
 * Sanitizes aggregated delivery analytics for customer-facing APIs, removing internal tenant financial metrics.
 */
export function sanitizeAnalyticsForCustomer(
  analytics: AggregatedDeliveryAnalytics,
): CustomerFacingDeliveryAnalytics {
  const {
    totalProjectedDeliveryCost,
    totalTenantSubsidy,
    totalProviderCost,
    ...customerPayload
  } = analytics;

  return customerPayload;
}
