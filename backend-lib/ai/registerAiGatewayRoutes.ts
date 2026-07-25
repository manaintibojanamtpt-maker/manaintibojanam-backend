import type { Express, Request, Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { isAiGatewayReady, readAiGatewayConfig } from './aiGatewayConfig.js';
import {
  assertModeChannelPolicy,
  buildModeSystemPrompt,
  getAllowedCapabilities,
  isAssistantMode,
  resolveAssistantChannel,
} from './assistantModeRouter.js';
import { redactMessagePreview } from './auditContracts.js';
import { configureAiAuditPersistence } from './aiAuditPersistence.js';
import { readAiAuditPersistenceConfig } from './aiAuditPersistenceConfig.js';
import { emitAiAuditEvent, getAiObservabilitySnapshot } from './aiMetricsCollector.js';
import {
  buildPostOrderSystemAddon,
  parsePostOrderAssistContext,
} from './postOrderAssistContracts.js';
import {
  buildOrderingSystemAddon,
  parseOrderingAssistContext,
} from './orderingAssistContracts.js';
import { buildAiCanaryRolloutSnapshot } from './rollout/aiRolloutContracts.js';
import { readAiCanaryRolloutConfig } from './rollout/aiRolloutConfig.js';
import {
  evaluateAiCanaryAssistGate,
  evaluateAiRolloutHealth,
  resolveAiCanaryRoutingKey,
  stableBucket,
  type AiCanaryAssistGateResult,
} from './rollout/aiRolloutPolicy.js';
import { OpenRouterClientError, openRouterChatCompletion } from './openRouterClient.js';
import {
  applyClaimedSideEffectGuard,
  evaluateAssistSafety,
  evaluateCartPlanRequestSafety,
} from './safetyGuardrails.js';
import { parseCartPlanRequest } from './cartActionPlan.js';
import { validateCartActionPlan } from './validateCartActionPlan.js';
import {
  buildStructuredOutputSystemAddon,
  parseStructuredAssistOutput,
} from './structuredOutput.js';
import type { AiAssistResponse } from './assistResponse.js';
import type { AiGatewayDisabledResponse } from './types.js';

type LoggerLike = {
  info: (payload: Record<string, unknown>) => void;
  warn: (payload: Record<string, unknown>) => void;
  error: (payload: Record<string, unknown>) => void;
};

function jsonError(
  res: Response,
  status: number,
  code: AiGatewayDisabledResponse['code'],
  error: string,
): void {
  const body: AiGatewayDisabledResponse = {
    success: false,
    error,
    code,
    schemaVersion: '2.0',
  };
  res.status(status).json(body);
}

/** Phase 20 — attach canary cohort / gate fields to audit + metrics (no UX change). */
function canaryAuditFields(routingKey: string, gate: AiCanaryAssistGateResult) {
  const key = routingKey.trim().slice(0, 64);
  return {
    ...(key ? { canaryRoutingKey: key, canaryBucket: stableBucket(key) } : {}),
    canaryGateApplied: gate.applied,
    ...(gate.applied ? { canaryGateReason: String(gate.decision.reason) } : {}),
  };
}

/**
 * Shared AI Gateway routes for OrderBhojan (web/Android) and bhojanos.com.
 * Phase 9: in-process observability snapshot on status — no cart/order mutations.
 */
export function registerAiGatewayRoutes(
  app: Express,
  deps: {
    readonly log?: LoggerLike;
    readonly db?: Firestore;
    readonly isBackedOff?: () => boolean;
    readonly onQuotaError?: (source: string) => void;
    readonly isQuotaError?: (err: unknown) => boolean;
  } = {},
): void {
  const log = deps.log;
  const db = deps.db;
  const config = readAiGatewayConfig();

  configureAiAuditPersistence({
    db,
    isBackedOff: deps.isBackedOff,
    onQuotaError: deps.onQuotaError,
    isQuotaError: deps.isQuotaError,
    log,
  });

  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many AI requests. Please wait and retry.',
      code: 'AI_RATE_LIMITED',
      schemaVersion: '2.0',
    },
  });

  app.get('/api/ai/v1/status', (_req: Request, res: Response) => {
    const latest = readAiGatewayConfig();
    res.json({
      success: true,
      schemaVersion: '2.0',
      phase: 25,
      enabled: latest.enabled,
      configured: Boolean(latest.apiKey),
      ready: isAiGatewayReady(latest),
      model: latest.model,
      modes: ['consumer_ordering', 'merchant_marketing'],
      sideEffectsSupported: false,
      contracts: {
        structuredOutput: true,
        intentTaxonomy: true,
        safetyGuardrails: true,
        auditEvents: true,
        consumerReadOnly: true,
        cartPlanValidation: true,
        androidChannelParity: true,
        voiceHooksClient: true,
        voiceOrderingTurnClient: true,
        voiceTtsClient: true,
        marketingAssistClient: true,
        marketingAssistUi: true,
        observabilityMetrics: true,
        postOrderAssistHooks: true,
        postOrderContextParsing: true,
        aiCanaryRolloutPolicy: true,
        aiOpsDashboardUi: true,
        aiCanaryAssistGate: true,
        consumerAssistUi: true,
        menuItemResolution: true,
        consumerVoiceUi: true,
        consumerPostOrderUi: true,
        postOrderHighRiskTriage: true,
        consumerPersonalizationUi: true,
        clientCanaryHeaders: true,
        canarySliceObservability: true,
        auditPersistence: true,
        cartPlanDecisionAudit: true,
        aiAuditReviewUi: true,
        offlineEvalHarness: true,
        goldenReviewSet: true,
        shadowTrafficValidation: true,
        shadowTrafficReplay: true,
        aiCanaryLiveRolloutGates: true,
      },
      observability: getAiObservabilitySnapshot(),
      rollout: buildAiCanaryRolloutSnapshot(),
      auditPersistence: {
        enabled: readAiAuditPersistenceConfig().enabled,
        collection: 'ai_audit_events',
        mode: 'fire_and_forget',
      },
      note: 'Gateway is OFF unless AI_GATEWAY_ENABLED=true. Durable AI audit writes require AI_AUDIT_PERSISTENCE_ENABLED=true. Consumer assist UI is flag-gated (FF_OB_AI_ASSISTANT). Canary cohort headers require FF_OB_AI_CANARY_HEADERS on OrderBhojan. Personalization requires FF_OB_AI_PERSONALIZATION. Cart plans require explicit confirmation. Frontends must not call OpenRouter directly.',
    });
  });

  app.post('/api/ai/v1/assist', aiLimiter, async (req: Request, res: Response) => {
    const latest = readAiGatewayConfig();
    const startedAt = Date.now();

    if (!latest.enabled) {
      emitAiAuditEvent(log, 'info', {
        eventType: 'ai.assist.disabled',
        correlationId:
          (typeof req.headers['x-correlation-id'] === 'string' && req.headers['x-correlation-id']) ||
          randomUUID(),
        success: false,
        errorCode: 'AI_GATEWAY_DISABLED',
      });
      return jsonError(
        res,
        503,
        'AI_GATEWAY_DISABLED',
        'AI gateway is disabled. Set AI_GATEWAY_ENABLED=true on the server to enable.',
      );
    }
    if (!latest.apiKey) {
      return jsonError(
        res,
        503,
        'AI_GATEWAY_NOT_CONFIGURED',
        'OPENROUTER_API_KEY is not configured on the server.',
      );
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    if (!isAssistantMode(body.mode)) {
      return jsonError(
        res,
        400,
        'AI_INVALID_REQUEST',
        'mode must be consumer_ordering or merchant_marketing',
      );
    }

    const channel = resolveAssistantChannel(body.channel);
    const policy = assertModeChannelPolicy(body.mode, channel);
    if (policy.ok === false) {
      return jsonError(res, 403, 'AI_MODE_FORBIDDEN', policy.error);
    }

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 4000) {
      return jsonError(res, 400, 'AI_INVALID_REQUEST', 'message must be a non-empty string (max 4000 chars)');
    }

    // Consumer assist: cart_* plans retained as non-executable proposals (confirm-to-apply on client).
    const readOnlyConsumer = body.mode === 'consumer_ordering';
    const postOrder = parsePostOrderAssistContext(body.context);
    const ordering = parseOrderingAssistContext(body.context);

    const conversationId =
      typeof body.conversationId === 'string' && body.conversationId.trim()
        ? body.conversationId.trim().slice(0, 128)
        : randomUUID();

    const correlationId =
      (typeof req.headers['x-correlation-id'] === 'string' && req.headers['x-correlation-id']) ||
      randomUUID();

    // Phase 13: optional canary gate (defaults unwired → allow).
    const canaryConfig = readAiCanaryRolloutConfig();
    const canaryHealth = evaluateAiRolloutHealth(getAiObservabilitySnapshot());
    const canaryRoutingKey = resolveAiCanaryRoutingKey({
      explicitKey: body.routingKey ?? req.headers['x-ai-canary-key'],
      conversationId,
      correlationId,
    });
    const canaryGate = evaluateAiCanaryAssistGate({
      canaryFlagEnabled: canaryConfig.enabled,
      stage: canaryConfig.stage,
      routingKey: canaryRoutingKey,
      wiredIntoAssist: canaryConfig.wiredIntoAssist,
      healthOk: canaryHealth.ok,
    });
    const canaryMeta = canaryAuditFields(canaryRoutingKey, canaryGate);
    if (!canaryGate.allow) {
      const code =
        canaryGate.decision.reason === 'HEALTH_GATE' ? 'AI_CANARY_HEALTH_GATE' : 'AI_CANARY_EXCLUDED';
      emitAiAuditEvent(log, 'warn', {
        eventType: 'ai.assist.blocked',
        correlationId,
        conversationId,
        mode: body.mode,
        channel,
        success: false,
        errorCode: code,
        messagePreview: redactMessagePreview(`[canary_${canaryGate.decision.reason}] ${message}`),
        ...canaryMeta,
      });
      return jsonError(
        res,
        403,
        code,
        code === 'AI_CANARY_HEALTH_GATE'
          ? 'AI canary health gate blocked this request.'
          : 'AI canary rollout excluded this request from the active percentage bucket.',
      );
    }

    emitAiAuditEvent(log, 'info', {
      eventType: 'ai.assist.request',
      correlationId,
      conversationId,
      mode: body.mode,
      channel,
      success: true,
      messagePreview: redactMessagePreview(
        postOrder.used
          ? `[post_order_context] ${message}`
          : ordering.used
            ? `[ordering_context] ${message}`
            : message,
      ),
      ...canaryMeta,
    });

    try {
      const postOrderAddon =
        body.mode === 'consumer_ordering' && postOrder.used && postOrder.context
          ? ` ${buildPostOrderSystemAddon(postOrder.context)}`
          : '';
      const orderingAddon =
        body.mode === 'consumer_ordering' && ordering.used && ordering.context
          ? ` ${buildOrderingSystemAddon(ordering.context)}`
          : '';
      const systemPrompt = `${buildModeSystemPrompt(body.mode)} ${buildStructuredOutputSystemAddon(body.mode)}${postOrderAddon}${orderingAddon}`;
      const completion = await openRouterChatCompletion({
        config: latest,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      });

      const parsed = parseStructuredAssistOutput({
        mode: body.mode,
        channel,
        message,
        modelText: completion.text,
      });

      let safety = evaluateAssistSafety(parsed.value, {
        allowMutationPlans: false,
        readOnlyConsumer,
      });
      safety = applyClaimedSideEffectGuard(safety);

      const latencyMs = Date.now() - startedAt;
      const structured = safety.sanitized;

      if (!safety.allowed && structured.safety.blocked && safety.violations.some((v) =>
        v.code === 'MODE_INTENT_MISMATCH' || v.code === 'EMPTY_REPLY' || v.code === 'CROSS_MODE_ACTION',
      )) {
        emitAiAuditEvent(log, 'warn', {
          eventType: 'ai.assist.blocked',
          correlationId,
          conversationId,
          mode: body.mode,
          channel,
          intent: structured.intent,
          model: completion.model,
          latencyMs,
          success: false,
          safetyBlocked: true,
          violationCodes: safety.violations.map((v) => v.code),
          errorCode: 'AI_SAFETY_BLOCKED',
          ...canaryMeta,
        });
        return jsonError(res, 422, 'AI_SAFETY_BLOCKED', 'Assistant response blocked by safety guardrails');
      }

      const response: AiAssistResponse = {
        success: true,
        schemaVersion: '2.0',
        mode: body.mode,
        channel,
        conversationId,
        reply: structured.reply,
        intent: structured.intent,
        structured,
        allowedCapabilities: getAllowedCapabilities(body.mode),
        sideEffects: [],
        provider: {
          name: 'openrouter',
          model: completion.model,
        },
        meta: {
          gatewayEnabled: true,
          phase: 3,
          mutatedState: false,
          structuredSource: parsed.source,
          safetyAllowed: safety.allowed,
          readOnlyConsumer,
        },
      };

      emitAiAuditEvent(log, 'info', {
        eventType: structured.safety.blocked ? 'ai.assist.blocked' : 'ai.assist.response',
        correlationId,
        conversationId,
        mode: body.mode,
        channel,
        intent: structured.intent,
        model: completion.model,
        latencyMs,
        success: true,
        safetyBlocked: structured.safety.blocked,
        violationCodes: safety.violations.map((v) => v.code),
        ...canaryMeta,
      });

      res.json(response);
    } catch (err) {
      const providerErr =
        err instanceof OpenRouterClientError
          ? err
          : new OpenRouterClientError(err instanceof Error ? err.message : 'AI provider failure');

      emitAiAuditEvent(log, 'error', {
        eventType: 'ai.assist.provider_error',
        correlationId,
        conversationId,
        mode: body.mode,
        channel,
        latencyMs: Date.now() - startedAt,
        success: false,
        errorCode: providerErr.code,
        messagePreview: redactMessagePreview(message),
        ...canaryMeta,
      });

      return jsonError(
        res,
        providerErr.status,
        providerErr.code === 'AI_GATEWAY_NOT_CONFIGURED'
          ? 'AI_GATEWAY_NOT_CONFIGURED'
          : 'AI_PROVIDER_ERROR',
        providerErr.message,
      );
    }
  });

  app.post('/api/ai/v1/consumer/cart-plan/validate', aiLimiter, async (req: Request, res: Response) => {
    const latest = readAiGatewayConfig();
    const startedAt = Date.now();

    if (!latest.enabled) {
      emitAiAuditEvent(log, 'info', {
        eventType: 'ai.cart_plan.disabled',
        correlationId:
          (typeof req.headers['x-correlation-id'] === 'string' && req.headers['x-correlation-id']) ||
          randomUUID(),
        success: false,
        errorCode: 'AI_GATEWAY_DISABLED',
        phase: 4,
      });
      return jsonError(
        res,
        503,
        'AI_GATEWAY_DISABLED',
        'AI gateway is disabled. Set AI_GATEWAY_ENABLED=true on the server to enable.',
      );
    }

    if (!db) {
      return jsonError(
        res,
        503,
        'AI_GATEWAY_NOT_CONFIGURED',
        'Cart plan validation requires Firestore; pass db to registerAiGatewayRoutes.',
      );
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    if (body.mode !== 'consumer_ordering') {
      return jsonError(res, 400, 'AI_INVALID_REQUEST', 'mode must be consumer_ordering');
    }

    const channel = resolveAssistantChannel(body.channel);
    const policy = assertModeChannelPolicy('consumer_ordering', channel);
    if (policy.ok === false) {
      return jsonError(res, 403, 'AI_MODE_FORBIDDEN', policy.error);
    }

    const conversationId =
      typeof body.conversationId === 'string' && body.conversationId.trim()
        ? body.conversationId.trim().slice(0, 128)
        : randomUUID();

    const correlationId =
      (typeof req.headers['x-correlation-id'] === 'string' && req.headers['x-correlation-id']) ||
      randomUUID();

    const cartCanaryConfig = readAiCanaryRolloutConfig();
    const cartCanaryHealth = evaluateAiRolloutHealth(getAiObservabilitySnapshot());
    const cartCanaryRoutingKey = resolveAiCanaryRoutingKey({
      explicitKey: body.routingKey ?? req.headers['x-ai-canary-key'],
      conversationId,
      correlationId,
    });
    const cartCanaryGate = evaluateAiCanaryAssistGate({
      canaryFlagEnabled: cartCanaryConfig.enabled,
      stage: cartCanaryConfig.stage,
      routingKey: cartCanaryRoutingKey,
      wiredIntoAssist: cartCanaryConfig.wiredIntoAssist,
      healthOk: cartCanaryHealth.ok,
    });
    const cartCanaryMeta = canaryAuditFields(cartCanaryRoutingKey, cartCanaryGate);
    if (!cartCanaryGate.allow) {
      const code =
        cartCanaryGate.decision.reason === 'HEALTH_GATE' ? 'AI_CANARY_HEALTH_GATE' : 'AI_CANARY_EXCLUDED';
      emitAiAuditEvent(log, 'warn', {
        eventType: 'ai.cart_plan.blocked',
        correlationId,
        conversationId,
        mode: 'consumer_ordering',
        channel,
        success: false,
        errorCode: code,
        phase: 4,
        ...cartCanaryMeta,
      });
      return jsonError(
        res,
        403,
        code,
        code === 'AI_CANARY_HEALTH_GATE'
          ? 'AI canary health gate blocked this request.'
          : 'AI canary rollout excluded this request from the active percentage bucket.',
      );
    }

    emitAiAuditEvent(log, 'info', {
      eventType: 'ai.cart_plan.request',
      correlationId,
      conversationId,
      mode: 'consumer_ordering',
      channel,
      success: true,
      phase: 4,
      planCount: Array.isArray(body.proposedActions) ? body.proposedActions.length : 0,
      ...cartCanaryMeta,
    });

    const safety = evaluateCartPlanRequestSafety({
      mode: body.mode,
      proposedActions: body.proposedActions,
    });

    if (!safety.allowed) {
      const blockedByPlaceOrder = safety.violations.some((v) => v.code === 'PLACE_ORDER_BLOCKED');
      emitAiAuditEvent(log, 'warn', {
        eventType: blockedByPlaceOrder ? 'ai.cart_plan.invalid' : 'ai.cart_plan.blocked',
        correlationId,
        conversationId,
        mode: 'consumer_ordering',
        channel,
        success: false,
        safetyBlocked: true,
        violationCodes: safety.violations.map((v) => v.code),
        errorCode: blockedByPlaceOrder ? 'AI_CART_PLAN_INVALID' : 'AI_SAFETY_BLOCKED',
        phase: 4,
        cartPlanStatus: 'invalid',
        ...cartCanaryMeta,
      });

      if (blockedByPlaceOrder) {
        return res.status(200).json({
          success: false,
          schemaVersion: '5.0',
          status: 'invalid',
          conversationId,
          channel,
          plans: [],
          issues: safety.violations.map((v) => ({ code: v.code, message: v.message })),
          sideEffects: [],
          mutatedState: false,
        });
      }

      return jsonError(res, 422, 'AI_SAFETY_BLOCKED', 'Cart plan request blocked by safety guardrails');
    }

    const parsed = parseCartPlanRequest(body);
    if (parsed.ok === false) {
      const status = parsed.issues.some((issue) => issue.code === 'PLACE_ORDER_REJECTED')
        ? 'invalid'
        : 'needs_clarification';

      emitAiAuditEvent(log, 'info', {
        eventType: status === 'invalid' ? 'ai.cart_plan.invalid' : 'ai.cart_plan.response',
        correlationId,
        conversationId,
        mode: 'consumer_ordering',
        channel,
        success: status !== 'invalid',
        phase: 4,
        cartPlanStatus: status,
        latencyMs: Date.now() - startedAt,
        ...cartCanaryMeta,
      });

      return res.status(200).json({
        success: status !== 'invalid',
        schemaVersion: '5.0',
        status,
        conversationId,
        channel,
        plans: [],
        ...(parsed.clarificationQuestions.length
          ? { clarificationQuestions: parsed.clarificationQuestions }
          : {}),
        issues: parsed.issues.map((issue) => ({ code: issue.code, message: issue.message })),
        sideEffects: [],
        mutatedState: false,
      });
    }

    const result = await validateCartActionPlan(db, parsed.value, safety.sanitizedPlans);
    const latencyMs = Date.now() - startedAt;

    emitAiAuditEvent(log, 'info', {
      eventType:
        result.status === 'invalid'
          ? 'ai.cart_plan.invalid'
          : 'ai.cart_plan.response',
      correlationId,
      conversationId,
      mode: 'consumer_ordering',
      channel,
      success: result.success,
      phase: 4,
      cartPlanStatus: result.status,
      planCount: result.plans.length,
      latencyMs,
      ...cartCanaryMeta,
    });

    // Always HTTP 200 for validation outcomes so clients can read status without treating invalid as transport failure.
    res.status(200).json({
      ...result,
      conversationId,
      channel,
    });
  });

  /**
   * Phase 21 — client confirm/deny audit (no cart mutation on server).
   * Fire-and-forget telemetry; UX must not depend on this call succeeding.
   */
  app.post('/api/ai/v1/consumer/cart-plan/decision', aiLimiter, async (req: Request, res: Response) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const decision = body.decision === 'confirm' || body.decision === 'discard' ? body.decision : null;
    if (!decision) {
      return jsonError(res, 400, 'AI_INVALID_REQUEST', 'decision must be confirm or discard');
    }

    const channel = resolveAssistantChannel(body.channel);
    const policy = assertModeChannelPolicy('consumer_ordering', channel);
    if (policy.ok === false) {
      return jsonError(res, 403, 'AI_MODE_FORBIDDEN', policy.error);
    }

    const conversationId =
      typeof body.conversationId === 'string' && body.conversationId.trim()
        ? body.conversationId.trim().slice(0, 128)
        : undefined;

    const correlationId =
      (typeof req.headers['x-correlation-id'] === 'string' && req.headers['x-correlation-id']) ||
      (typeof body.correlationId === 'string' && body.correlationId.trim()
        ? body.correlationId.trim().slice(0, 128)
        : randomUUID());

    const canaryRoutingKey = resolveAiCanaryRoutingKey({
      explicitKey: body.routingKey ?? req.headers['x-ai-canary-key'],
      conversationId,
      correlationId,
    });
    const canaryConfig = readAiCanaryRolloutConfig();
    const canaryGate = evaluateAiCanaryAssistGate({
      canaryFlagEnabled: canaryConfig.enabled,
      stage: canaryConfig.stage,
      routingKey: canaryRoutingKey,
      wiredIntoAssist: false, // decision audit is never percentage-gated
      healthOk: true,
    });
    const canaryMeta = canaryAuditFields(canaryRoutingKey, canaryGate);

    const planCount =
      typeof body.planCount === 'number' && Number.isFinite(body.planCount)
        ? Math.max(0, Math.floor(body.planCount))
        : undefined;

    emitAiAuditEvent(log, 'info', {
      eventType: decision === 'confirm' ? 'ai.cart_plan.confirmed' : 'ai.cart_plan.discarded',
      correlationId,
      ...(conversationId ? { conversationId } : {}),
      mode: 'consumer_ordering',
      channel,
      success: true,
      phase: 4,
      ...(typeof planCount === 'number' ? { planCount } : {}),
      cartPlanStatus: decision === 'confirm' ? 'validated' : undefined,
      ...canaryMeta,
    });

    res.status(200).json({
      success: true,
      schemaVersion: '21.0',
      decision,
      conversationId: conversationId ?? null,
      mutatedState: false,
      auditPersistenceEnabled: readAiAuditPersistenceConfig().enabled,
    });
  });
}
