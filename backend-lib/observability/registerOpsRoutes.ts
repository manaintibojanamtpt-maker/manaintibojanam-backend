import type { Express, Request, Response } from 'express';
import type { IncidentRepository } from './IncidentRepository.js';
import { getAutopilotIncidentTypes } from './IncidentRepository.js';

type RequireSuperadminFn = (req: Request, res: Response, next: () => void) => void | Promise<void>;

export function registerOpsRoutes(
  app: Express,
  getIncidentRepository: () => IncidentRepository | undefined,
  requireSuperadmin: RequireSuperadminFn,
): void {
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
