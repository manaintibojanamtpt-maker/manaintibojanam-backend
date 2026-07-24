import type { Express, Request, Response } from 'express';
import { recordLastGoldenEvalReport } from '../eval/lastGoldenEvalStore.js';
import { runGoldenEval } from '../eval/runGoldenEval.js';
import { readAiShadowTrafficConfig } from '../aiShadowTrafficConfig.js';
import { listAiShadowSamples } from './aiShadowTrafficStore.js';
import { compareShadowBatch } from './compareShadowToGolden.js';
import type { ShadowCompareReport } from './aiShadowCompareReport.js';
import { recordLastShadowCompareReport } from './lastShadowCompareStore.js';
import {
  AI_SHADOW_SCHEMA_VERSION,
  type AiShadowSample,
} from './aiShadowTrafficTypes.js';

type RequireSuperadminFn = (req: Request, res: Response, next: () => void) => void | Promise<void>;

function toOpsSampleRow(sample: AiShadowSample) {
  return {
    id: sample.id,
    capturedAt: sample.capturedAt,
    eventType: sample.audit.sourceEventType,
    mode: sample.request.mode,
    channel: sample.request.channel,
    messagePreview: sample.request.message,
    correlationId: sample.audit.correlationId,
    intent: sample.audit.intent,
    model: sample.audit.model,
    safetyBlocked: sample.audit.safetyBlocked,
    cartPlanStatus: sample.audit.cartPlanStatus,
    errorCode: sample.audit.errorCode,
    // Keep nested original for advanced replay/debug
    request: sample.request,
    audit: sample.audit,
    schemaVersion: sample.schemaVersion,
  };
}

function buildByCategory(report: ShadowCompareReport): Record<
  string,
  { total: number; passed: number; failed: number; drifted: number }
> {
  const byCategory: Record<
    string,
    { total: number; passed: number; failed: number; drifted: number }
  > = {};
  for (const result of report.results) {
    for (const hit of result.categoryHits) {
      if (!byCategory[hit.category]) {
        byCategory[hit.category] = { total: 0, passed: 0, failed: 0, drifted: 0 };
      }
      const row = byCategory[hit.category]!;
      row.total += 1;
      if (hit.ok) row.passed += 1;
      else {
        row.failed += 1;
        row.drifted += 1;
      }
    }
  }
  return byCategory;
}

function toOpsReplayReport(report: ShadowCompareReport) {
  return {
    schemaVersion: report.schemaVersion,
    mutatedState: false as const,
    total: report.total,
    passed: report.passed,
    failed: report.failed,
    drifted: report.driftCount,
    byCategory: buildByCategory(report),
    results: report.results.map((r) => ({
      sampleId: r.sampleId,
      status: r.drift ? ('drifted' as const) : ('passed' as const),
      message: r.message,
      category: r.categoriesRun[0],
      driftFields: r.driftReasons,
      categoriesRun: r.categoriesRun,
      categoryHits: r.categoryHits,
    })),
    // Keep full compare payload for operators/scripts
    compare: report,
  };
}

function parseSamplesBody(body: unknown): AiShadowSample[] | null {
  if (!body || typeof body !== 'object') return null;
  const samples = (body as { samples?: unknown }).samples;
  if (!Array.isArray(samples)) return null;
  return samples.filter((s): s is AiShadowSample => {
    if (!s || typeof s !== 'object') return false;
    const row = s as AiShadowSample & { messagePreview?: string; eventType?: string };
    // Accept full AiShadowSample
    if (
      row.schemaVersion === AI_SHADOW_SCHEMA_VERSION &&
      row.request &&
      typeof row.request.message === 'string' &&
      typeof row.id === 'string'
    ) {
      return true;
    }
    return false;
  });
}

/**
 * Phase 24 — superadmin shadow traffic sample list + offline replay compare.
 * Never calls OpenRouter; never mutates cart/checkout state.
 */
export function registerAiShadowRoutes(
  app: Express,
  requireSuperadmin: RequireSuperadminFn,
): void {
  app.get('/api/ops/ai/shadow/samples', requireSuperadmin, (req: Request, res: Response) => {
    try {
      const config = readAiShadowTrafficConfig();
      const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : config.maxBatch;
      const limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.floor(limitRaw) : config.maxBatch;
      const samples = listAiShadowSamples(Math.min(limit, config.maxBatch));

      res.json({
        success: true,
        schemaVersion: AI_SHADOW_SCHEMA_VERSION,
        mutatedState: false,
        enabled: config.enabled,
        shadowTrafficEnabled: config.enabled,
        count: samples.length,
        samples: samples.map(toOpsSampleRow),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list shadow samples';
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post('/api/ops/ai/shadow/replay', requireSuperadmin, (req: Request, res: Response) => {
    try {
      const config = readAiShadowTrafficConfig();
      const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
        samples?: unknown;
        fromBuffer?: unknown;
        limit?: unknown;
        includeGoldenBaseline?: unknown;
      };

      let samples: AiShadowSample[] = [];
      const parsed = parseSamplesBody(body);
      if (parsed && parsed.length > 0) {
        samples = parsed.slice(0, config.maxBatch);
      } else {
        // Ops UI posts `{ limit }` — treat as fromBuffer replay
        const limitRaw = typeof body.limit === 'number' ? body.limit : Number(body.limit);
        const limit =
          Number.isFinite(limitRaw) && limitRaw >= 1
            ? Math.min(Math.floor(limitRaw), config.maxBatch)
            : config.maxBatch;
        samples = [...listAiShadowSamples(limit)];
      }

      const compare = compareShadowBatch(samples);
      recordLastShadowCompareReport(compare);
      const report = toOpsReplayReport(compare);

      const includeBaseline = body.includeGoldenBaseline === true;
      const goldenBaseline = includeBaseline ? runGoldenEval() : null;
      if (goldenBaseline) {
        recordLastGoldenEvalReport(goldenBaseline);
      }

      res.json({
        success: true,
        schemaVersion: AI_SHADOW_SCHEMA_VERSION,
        mutatedState: false,
        enabled: config.enabled,
        shadowTrafficEnabled: config.enabled,
        offlineOnly: true,
        report,
        ...(goldenBaseline
          ? {
              goldenBaseline: {
                passed: goldenBaseline.passed,
                failed: goldenBaseline.failed,
                total: goldenBaseline.total,
                mutatedState: false as const,
              },
            }
          : {}),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to replay shadow traffic';
      res.status(500).json({ success: false, error: message });
    }
  });
}
