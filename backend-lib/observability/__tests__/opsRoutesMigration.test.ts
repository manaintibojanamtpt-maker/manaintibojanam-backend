import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('ops routes migration', () => {
  it('registers superadmin-gated ops incident read routes', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/observability/registerOpsRoutes.ts'),
      'utf8',
    );
    for (const route of [
      "app.get('/api/ops/incidents'",
      "app.get('/api/ops/incidents/stats'",
      "app.get('/api/ops/health-summary'",
    ]) {
      assert.match(source, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.match(source, /requireSuperadmin/);
    assert.match(source, /getIncidentRepository/);
    assert.match(source, /system_incidents/);
    assert.match(source, /getAutopilotIncidentTypes/);
  });

  it('wires registerOpsRoutes in server with incident repository', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
    assert.match(source, /registerOpsRoutes\(app, getIncidentRepository, requireSuperadmin\)/);
    assert.match(source, /from "\.\/backend-lib\/observability\/registerOpsRoutes\.js"/);
    assert.match(source, /getAutopilotIncidentTypes/);
    assert.match(source, /countIncidentsByTypesSince\(autopilotTypes/);
  });

  it('exposes ops read client for founder dashboard', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/opsHealthApi.ts'), 'utf8');
    assert.match(source, /\/api\/ops\/incidents/);
    assert.match(source, /\/api\/ops\/incidents\/stats/);
    assert.match(source, /\/api\/ops\/health-summary/);
    assert.match(source, /\/api\/health/);
    assert.match(source, /loadOpsDashboardSnapshot/);
  });

  it('AutoPilot and ops stats share system_incidents type counts', () => {
    const repoSource = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/observability/IncidentRepository.ts'),
      'utf8',
    );
    assert.match(repoSource, /countIncidentsByTypesSince/);
    assert.match(repoSource, /export function getAutopilotIncidentTypes/);

    const typesSource = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/observability/incidentTypes.ts'),
      'utf8',
    );
    assert.match(typesSource, /INCIDENT_COLLECTION = 'system_incidents'/);
  });
});
