/**
 * Phase 5 — Kitchen Preparation Engine (STEP 8).
 *
 * Server-side kitchen preparation-time estimator that a later step (ETA
 * composition) can consume once integration is approved. This module is a pure,
 * stateless domain capability: NO travel calculation, NO distance math, NO
 * routing, NO live providers, NO checkout/tracking wiring, and NO lifecycle
 * persistence.
 *
 * Step 8 owns ONLY kitchen preparation time. Deliberately out of scope:
 * road/travel time, delivery ETA, rider assignment, rider-to-kitchen time,
 * pickup handling, operational delivery buffers, provider ETA, customer ETA,
 * checkout integration, tracking integration, and lifecycle writes.
 *
 * Canonical configuration (tenant-scoped through the request):
 *   kitchenConfig.defaultPrepTimeMinutes   (canonical, wins)
 *   deliveryConfig.prepTime                (legacy — still supported)
 *   DEFAULT_PREP_TIME_MINUTES              (approved repository default)
 *
 * Resolution precedence (finite + strictly positive only):
 *   1. kitchenConfig.defaultPrepTimeMinutes
 *   2. tenantDeliveryConfig.prepTime
 *   3. DEFAULT_PREP_TIME_MINUTES
 * Zero/negative/non-finite configured values are never used — they would make
 * the estimate artificially optimistic (0 or negative prep) — so they are
 * treated as absent and the chain continues. The fallback is the same approved
 * constant the serviceability ETA path uses; the engine never invents a value.
 *
 * Actual preparation lifecycle (input evidence only — never persisted here):
 *   not started -> remaining = estimated
 *   started     -> remaining = max(estimated - elapsed, 0)
 *   completed   -> remaining = 0
 *
 * Item preparation: kitchenConfig.itemPrepTimeMinutes (Step-2 shape) is reused.
 * Per-item estimates are surfaced as traceable metadata and are NEVER blindly
 * summed — the repository defines no approved item-prep aggregation rule, so
 * aggregation is documented as deferred. Order-level estimatedMinutes always
 * stays the resolved default prep time.
 *
 * Capacity: kitchenConfig.capacity is configuration metadata. Optional
 * authoritative workload evidence (structurally compatible with a branch
 * capacity snapshot) is accepted and carried on the result for a later step.
 * Step 8 never folds queue minutes into the estimate and never fabricates
 * utilization, concurrency, queue length, or active kitchen workload.
 *
 * Acceptance mode: kitchenConfig.orderAcceptanceMode is surfaced as metadata
 * only. Step 8 gives AUTO/MANUAL no preparation-duration effect — if acceptance
 * mode ever gates whether an order may proceed, that concern stays outside this
 * engine.
 */

import { DEFAULT_PREP_TIME_MINUTES } from '../marketplace/etaEstimate.js';
import type { TenantDeliveryConfig } from '../marketplace/tenantProjectionHelpers.js';
import type {
  KitchenConfigShape,
  PrepConfidence,
  PrepEstimate,
  PrepSource,
} from './deliveryIntelligenceTypes.js';

/** Identity of this preparation engine — carried on every result. */
export const PREP_ENGINE_ID = 'PrepEngine/v1' as const;

/** Overall state of a preparation estimate produced by this engine. */
export type PrepEngineStatus = 'ESTIMATED' | 'ACTUAL' | 'UNAVAILABLE';

/** Which configuration tier produced the resolved preparation duration. */
export type PrepConfigTier = 'KITCHEN_CONFIG' | 'LEGACY_DELIVERY_CONFIG' | 'APPROVED_DEFAULT';

/** Progress of preparation according to the supplied lifecycle evidence. */
export type PrepLifecycleStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

/** One ordered item referenced in a request (quantity is informational in Step 8). */
export interface PrepItemInput {
  readonly itemId: string;
  readonly quantity?: number;
}

/**
 * Optional authoritative kitchen-workload evidence (structurally compatible with
 * the repository's branch capacity snapshot). Step 8 validates and carries it on
 * the result for a later step; it never derives or invents workload metrics.
 */
export interface PrepWorkloadEvidenceInput {
  readonly activeOrders?: number;
  readonly maxConcurrentOrders?: number;
  readonly prepQueueMins?: number;
  readonly congestionLevel?: string;
  readonly acceptingOrders?: boolean;
  readonly capturedAt?: number | string;
}

export interface PrepEngineRequest {
  /** Tenant scope — recorded on the result and never shared across requests. */
  readonly tenantId: string;
  /** Canonical tenant kitchen configuration (Step-2 shape). */
  readonly kitchenConfig?: KitchenConfigShape;
  /** Legacy tenant delivery configuration — prepTime remains supported. */
  readonly tenantDeliveryConfig?: TenantDeliveryConfig;
  /** Ordered items, used only for per-item metadata lookups. */
  readonly items?: readonly PrepItemInput[];
  /** Actual-lifecycle evidence (ISO timestamps). Never persisted by this engine. */
  readonly preparationStartedAt?: string;
  readonly preparationCompletedAt?: string;
  /** Repository scheduled-order semantics ('instant' | 'scheduled'). */
  readonly fulfillmentType?: 'instant' | 'scheduled';
  readonly scheduledFor?: string;
  /** Authoritative workload evidence — metadata passthrough only in Step 8. */
  readonly workloadEvidence?: PrepWorkloadEvidenceInput;
  /** Deterministic clock — defaults to `new Date()`. */
  readonly now?: Date;
  readonly requestId?: string;
}

/** Per-item preparation estimate resolved from itemPrepTimeMinutes (not summed). */
export interface PrepItemEstimate {
  readonly itemId: string;
  readonly estimatedMinutes: number;
  readonly source: Extract<PrepSource, 'ITEM_MAP'>;
}

/** Preparation lifecycle detail derived from the supplied evidence. */
export interface PrepLifecycleDetail {
  readonly status: PrepLifecycleStatus;
  readonly startedAt?: string;
  readonly completedAt?: string;
  /** Present when preparation is in progress — fractional minutes allowed. */
  readonly elapsedMinutes?: number;
}

export interface PrepEngineResult {
  readonly status: PrepEngineStatus;
  /** Total estimated preparation duration. null when configuration is unusable. */
  readonly estimatedMinutes: number | null;
  /** Remaining preparation time given lifecycle evidence. null when unavailable. */
  readonly remainingMinutes: number | null;
  readonly source: PrepSource;
  readonly confidence: PrepConfidence;
  readonly calculatedAt: string;
  readonly engineVersion: string;
  /** Which config tier + tenant produced the estimate (null when unavailable). */
  readonly configReference: { readonly tier: PrepConfigTier; readonly tenantId: string } | null;
  readonly preparationLifecycle?: PrepLifecycleDetail;
  readonly itemEstimates: readonly PrepItemEstimate[];
  readonly capacity: {
    /** kitchenConfig.capacity — configuration metadata, never used in the math. */
    readonly configuredCapacity: number | null;
    readonly workloadEvidence?: PrepWorkloadEvidenceInput;
  };
  readonly acceptanceMode: 'AUTO' | 'MANUAL' | null;
  readonly scheduled?: {
    readonly fulfillmentType: 'instant' | 'scheduled';
    readonly scheduledFor?: string;
  };
  readonly requestId?: string;
}

export interface PrepEngineConfig {
  readonly engineId?: string;
}

export interface PrepEngine {
  readonly engineId: string;
  estimate(request: PrepEngineRequest): PrepEngineResult;
}

interface ResolvedPrep {
  readonly minutes: number;
  readonly tier: PrepConfigTier;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function resolveDefaultPrep(
  kitchenConfig: KitchenConfigShape | undefined,
  tenantDeliveryConfig: TenantDeliveryConfig | undefined,
): ResolvedPrep | null {
  const canonical = kitchenConfig?.defaultPrepTimeMinutes;
  if (typeof canonical === 'number' && isPositiveFinite(canonical)) {
    return { minutes: canonical, tier: 'KITCHEN_CONFIG' };
  }
  const legacy = tenantDeliveryConfig?.prepTime;
  if (typeof legacy === 'number' && isPositiveFinite(legacy)) {
    return { minutes: legacy, tier: 'LEGACY_DELIVERY_CONFIG' };
  }
  if (isPositiveFinite(DEFAULT_PREP_TIME_MINUTES)) {
    return { minutes: DEFAULT_PREP_TIME_MINUTES, tier: 'APPROVED_DEFAULT' };
  }
  return null;
}

function resolveItemEstimates(
  items: readonly PrepItemInput[] | undefined,
  itemPrepTimeMinutes: Readonly<Record<string, number>> | undefined,
): PrepItemEstimate[] {
  if (!items || !itemPrepTimeMinutes) return [];
  const estimates: PrepItemEstimate[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const id = item?.itemId;
    if (!id || seen.has(id)) continue;
    const minutes = itemPrepTimeMinutes[id];
    if (typeof minutes === 'number' && isPositiveFinite(minutes)) {
      estimates.push({ itemId: id, estimatedMinutes: minutes, source: 'ITEM_MAP' });
    }
    seen.add(id);
  }
  return estimates;
}

function resolveLifecycle(request: PrepEngineRequest, nowMs: number): PrepLifecycleDetail {
  const startedMs = request.preparationStartedAt ? Date.parse(request.preparationStartedAt) : Number.NaN;
  const completedMs = request.preparationCompletedAt ? Date.parse(request.preparationCompletedAt) : Number.NaN;
  const startedValid = Number.isFinite(startedMs);
  const completedValid = Number.isFinite(completedMs);

  if (completedValid) {
    return {
      status: 'COMPLETED',
      ...(startedValid ? { startedAt: request.preparationStartedAt } : {}),
      completedAt: request.preparationCompletedAt,
    };
  }
  if (startedValid) {
    return {
      status: 'IN_PROGRESS',
      startedAt: request.preparationStartedAt,
      elapsedMinutes: Math.max(0, (nowMs - startedMs) / 60000),
    };
  }
  return { status: 'NOT_STARTED' };
}

function positiveOrNull(value: number | undefined): number | null {
  return typeof value === 'number' && isPositiveFinite(value) ? value : null;
}

function normalizeAcceptanceMode(
  mode: KitchenConfigShape['orderAcceptanceMode'],
): PrepEngineResult['acceptanceMode'] {
  return mode === 'AUTO' || mode === 'MANUAL' ? mode : null;
}

function estimatePrep(request: PrepEngineRequest, engineVersion: string): PrepEngineResult {
  const now = request.now ?? new Date();
  const calculatedAt = now.toISOString();

  const resolved = resolveDefaultPrep(request.kitchenConfig, request.tenantDeliveryConfig);
  const configuredCapacity = positiveOrNull(request.kitchenConfig?.capacity);
  const acceptanceMode = normalizeAcceptanceMode(request.kitchenConfig?.orderAcceptanceMode);

  if (!resolved) {
    // Defensive: unreachable while DEFAULT_PREP_TIME_MINUTES is the approved
    // positive constant. Never invents an arbitrary duration.
    return {
      status: 'UNAVAILABLE',
      estimatedMinutes: null,
      remainingMinutes: null,
      source: 'UNKNOWN',
      confidence: 'UNAVAILABLE',
      calculatedAt,
      engineVersion,
      configReference: null,
      itemEstimates: [],
      capacity: { configuredCapacity },
      acceptanceMode,
      ...(request.requestId ? { requestId: request.requestId } : {}),
    };
  }

  const itemEstimates = resolveItemEstimates(request.items, request.kitchenConfig?.itemPrepTimeMinutes);
  const lifecycle = resolveLifecycle(request, now.getTime());
  const hasActualEvidence = lifecycle.status === 'IN_PROGRESS' || lifecycle.status === 'COMPLETED';

  let remainingMinutes: number;
  if (lifecycle.status === 'COMPLETED') {
    remainingMinutes = 0;
  } else if (lifecycle.status === 'IN_PROGRESS') {
    remainingMinutes = Math.max(resolved.minutes - (lifecycle.elapsedMinutes ?? 0), 0);
  } else {
    remainingMinutes = resolved.minutes;
  }

  const source: PrepSource = hasActualEvidence ? 'ACTUAL' : 'CONFIG';
  const confidence: PrepConfidence = hasActualEvidence
    ? 'HIGH'
    : resolved.tier === 'APPROVED_DEFAULT'
      ? 'LOW'
      : 'MEDIUM';

  return {
    status: hasActualEvidence ? 'ACTUAL' : 'ESTIMATED',
    estimatedMinutes: resolved.minutes,
    remainingMinutes,
    source,
    confidence,
    calculatedAt,
    engineVersion,
    configReference: { tier: resolved.tier, tenantId: request.tenantId },
    preparationLifecycle: lifecycle,
    itemEstimates,
    capacity: {
      configuredCapacity,
      ...(request.workloadEvidence ? { workloadEvidence: request.workloadEvidence } : {}),
    },
    acceptanceMode,
    ...(request.fulfillmentType
      ? {
          scheduled: {
            fulfillmentType: request.fulfillmentType,
            ...(request.scheduledFor ? { scheduledFor: request.scheduledFor } : {}),
          },
        }
      : {}),
    ...(request.requestId ? { requestId: request.requestId } : {}),
  };
}

/**
 * Maps an engine result onto the canonical {@link PrepEstimate} contract so the
 * output can feed {@link buildDeliveryDecision} without any decision-layer
 * change. Internal detail (config tier, lifecycle, capacity, item map) stays in
 * the engine result only.
 */
export function toDeliveryPrep(result: PrepEngineResult): PrepEstimate {
  return {
    estimatedMinutes: result.estimatedMinutes,
    remainingMinutes: result.remainingMinutes,
    source: result.source,
    confidence: result.confidence,
    calculatedAt: result.calculatedAt,
  };
}

export function createPrepEngine(config: PrepEngineConfig = {}): PrepEngine {
  const engineVersion = config.engineId?.trim() || PREP_ENGINE_ID;
  return {
    engineId: engineVersion,
    estimate(request: PrepEngineRequest): PrepEngineResult {
      return estimatePrep(request, engineVersion);
    },
  };
}
