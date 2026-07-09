/**
 * Minimal health/metrics server for staging infrastructure containers.
 * Production worker images bind frozen SDK runtime at CI build — this shell
 * satisfies health probes until runtime wiring is deployed.
 */
import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT ?? 8080);
const METRICS_PORT = Number(process.env.METRICS_PORT ?? 9090);
const workerType = process.env.WORKER_TYPE ?? 'unknown';
const startTime = Date.now();

const health = (path: string): { status: number; body: object } => {
  const uptime = (Date.now() - startTime) / 1000;
  if (path === '/health/live') return { status: 200, body: { status: 'live', workerType } };
  if (path === '/health/ready') return { status: 200, body: { status: 'ready', workerType, uptime } };
  if (path === '/health/projection')
    return { status: 200, body: { status: 'ok', checkpointAgeMs: 0, workerType } };
  return { status: 404, body: { error: 'not found' } };
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const { status, body } = health(url.pathname);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
});

const metricsServer = http.createServer((_req, res) => {
  const metrics = [
    `# HELP up Worker up status`,
    `up{worker="${workerType}"} 1`,
    `# HELP projection_checkpoint_age_ms Checkpoint age`,
    `projection_checkpoint_age_ms{worker="${workerType}"} 0`,
    `# HELP outbox_depth Outbox queue depth`,
    `outbox_depth 0`,
    `# HELP prod_spine_flags_enabled_count Production spine flags enabled`,
    `prod_spine_flags_enabled_count 0`,
  ].join('\n');
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(metrics);
});

server.listen(PORT, () => console.log(`Health server listening on ${PORT}`));
metricsServer.listen(METRICS_PORT, () => console.log(`Metrics on ${METRICS_PORT}`));
