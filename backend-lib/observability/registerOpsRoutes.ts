import type { Express, Request, Response } from 'express';
import { getAiObservabilitySnapshot } from '../ai/aiMetricsCollector.js';
import { isAiGatewayReady, readAiGatewayConfig } from '../ai/aiGatewayConfig.js';
import { getAiAuditEventRepository } from '../ai/aiAuditPersistence.js';
import { readAiAuditPersistenceConfig } from '../ai/aiAuditPersistenceConfig.js';
import { AI_AUDIT_COLLECTION } from '../ai/aiAuditEventRepository.js';
import { buildAiCanaryRolloutSnapshot } from '../ai/rollout/aiRolloutContracts.js';
import type { IncidentRepository } from './IncidentRepository.js';
import { getAutopilotIncidentTypes } from './IncidentRepository.js';
import { registerAiShadowRoutes } from '../ai/shadow/registerAiShadowRoutes.js';

type RequireSuperadminFn = (req: Request, res: Response, next: () => void) => void | Promise<void>;

export function registerOpsRoutes(
  app: Express,
  getIncidentRepository: () => IncidentRepository | undefined,
  requireSuperadmin: RequireSuperadminFn,
): void {
  registerAiShadowRoutes(app, requireSuperadmin);

  /**
   * Phase 9/12 — read-only AI gateway metrics + canary snapshot. Superadmin only.
   * Does not enable the gateway, mutate canary stage, or expose PII.
   */
  app.get('/api/ops/ai/summary', requireSuperadmin, (_req: any, res: Response) => {
    try {
      const gateway = readAiGatewayConfig();
      const observability = getAiObservabilitySnapshot();
      const rollout = buildAiCanaryRolloutSnapshot();
      const auditPersistence = readAiAuditPersistenceConfig();
      res.json({
        success: true,
        schemaVersion: '21.0',
        mutatedState: false,
        gateway: {
          enabled: gateway.enabled,
          configured: Boolean(gateway.apiKey),
          ready: isAiGatewayReady(gateway),
          model: gateway.model,
        },
        observability,
        rollout,
        auditPersistence: {
          enabled: auditPersistence.enabled,
          collection: AI_AUDIT_COLLECTION,
          repositoryConfigured: Boolean(getAiAuditEventRepository()),
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load AI ops summary';
      res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * Phase 21/22 — durable AI audit event review (superadmin). Read-only; no mutations.
   * Query: ?since=ISO&eventType=...&eventTypes=a,b&correlationId=...&errorCode=...&canaryBucket=7&safetyBlocked=1&limit=50
   */
  app.get('/api/ops/ai/audit-events', requireSuperadmin, async (req: any, res: Response) => {
    try {
      const repo = getAiAuditEventRepository();
      if (!repo) {
        return res.status(503).json({
          success: false,
          error: 'AI audit repository unavailable',
          auditPersistenceEnabled: readAiAuditPersistenceConfig().enabled,
        });
      }

      const since = typeof req.query.since === 'string' ? req.query.since : undefined;
      const eventType = typeof req.query.eventType === 'string' ? req.query.eventType : undefined;
      const eventTypesRaw =
        typeof req.query.eventTypes === 'string' ? req.query.eventTypes : undefined;
      const eventTypes = eventTypesRaw
        ? eventTypesRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;
      const correlationId =
        typeof req.query.correlationId === 'string' ? req.query.correlationId : undefined;
      const errorCode = typeof req.query.errorCode === 'string' ? req.query.errorCode : undefined;
      const canaryBucketRaw =
        typeof req.query.canaryBucket === 'string' ? Number(req.query.canaryBucket) : NaN;
      const canaryBucket = Number.isFinite(canaryBucketRaw) ? canaryBucketRaw : undefined;
      const safetyBlocked =
        req.query.safetyBlocked === '1' ||
        req.query.safetyBlocked === 'true' ||
        req.query.safetyBlocked === 'yes'
          ? true
          : undefined;
      const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
      const limit = Number.isFinite(limitRaw) ? limitRaw : 50;

      const events = await repo.listEvents({
        since,
        eventType,
        eventTypes,
        correlationId,
        errorCode,
        canaryBucket,
        safetyBlocked,
        limit,
      });
      res.json({
        success: true,
        schemaVersion: '22.0',
        mutatedState: false,
        collection: AI_AUDIT_COLLECTION,
        auditPersistenceEnabled: readAiAuditPersistenceConfig().enabled,
        count: events.length,
        events,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list AI audit events';
      res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * Unified incident read path for founder / ops dashboards.
   * Query: ?since=ISO&type=system_errors&status=DETECTED&tenantId=...&limit=50
   */
  app.get('/api/ops/incidents', requireSuperadmin, async (req: any, res: Response) => {
    try {
      const repo = getIncidentRepository();
      if (!repo) {
        return res.status(503).json({ success: false, error: 'Incident repository unavailable' });
      }

      const since = typeof req.query.since === 'string' ? req.query.since : undefined;
      const type = typeof req.query.type === 'string' ? req.query.type : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const tenantId = typeof req.query.tenantId === 'string' ? req.query.tenantId : undefined;
      const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
      const limit = Number.isFinite(limitRaw) ? limitRaw : 50;

      const incidents = await repo.listIncidents({ since, type, status, tenantId, limit });
      res.json({
        success: true,
        count: incidents.length,
        incidents,
        schemaVersion: '1.0',
        collection: 'system_incidents',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list incidents';
      res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * Hourly-style incident counts by type — same source AutoPilot uses.
   * Query: ?since=ISO (default: last 1 hour)
   */
  app.get('/api/ops/incidents/stats', requireSuperadmin, async (req: any, res: Response) => {
    try {
      const repo = getIncidentRepository();
      if (!repo) {
        return res.status(503).json({ success: false, error: 'Incident repository unavailable' });
      }

      const since =
        typeof req.query.since === 'string'
          ? req.query.since
          : new Date(Date.now() - 3_600_000).toISOString();

      const types = getAutopilotIncidentTypes();
      const stats = await repo.countIncidentsByTypesSince(types, since);

      res.json({
        success: true,
        ...stats,
        schemaVersion: '1.0',
        collection: 'system_incidents',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load incident stats';
      res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * Aggregated ops dashboard payload — API health, open incidents, deploy, trend.
   */
  app.get('/api/ops/health-summary', requireSuperadmin, async (_req: any, res: Response) => {
    try {
      const repo = getIncidentRepository();
      const latestDeploy = process.env.RENDER_GIT_COMMIT?.slice(0, 7) || 'local';
      const timestamp = new Date().toISOString();

      if (!repo) {
        return res.json({
          success: true,
          apiHealth: { status: 'degraded', timestamp },
          openIncidentsCount: null,
          latestDeploy,
          incidentStats: null,
          incidentTrend: null,
          schemaVersion: '1.0',
        });
      }

      const incidents = await repo.listIncidents({ limit: 200 });
      const openIncidentsCount = incidents.filter(
        (row) => row.status !== 'RESOLVED' && row.status !== 'VERIFIED',
      ).length;

      const types = getAutopilotIncidentTypes();
      const since24h = new Date(Date.now() - 86_400_000).toISOString();
      const since1h = new Date(Date.now() - 3_600_000).toISOString();
      const [stats24h, stats1h] = await Promise.all([
        repo.countIncidentsByTypesSince(types, since24h),
        repo.countIncidentsByTypesSince(types, since1h),
      ]);

      const hourlyMap = new Map<string, number>();
      for (const incident of incidents) {
        if (incident.createdAt >= since24h) {
          const hour = `${incident.createdAt.slice(0, 13)}:00`;
          hourlyMap.set(hour, (hourlyMap.get(hour) ?? 0) + 1);
        }
      }
      const incidentTrend = [...hourlyMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hour, count]) => ({ hour, count }));

      res.json({
        success: true,
        apiHealth: { status: 'ok', timestamp },
        openIncidentsCount,
        latestDeploy,
        incidentStats: { last1h: stats1h, last24h: stats24h },
        incidentTrend,
        schemaVersion: '1.0',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load health summary';
      res.status(500).json({ success: false, error: message });
    }
  });
}
