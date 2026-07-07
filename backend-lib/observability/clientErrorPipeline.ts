import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { IncidentRepository } from './IncidentRepository.js';
import type { IncidentSeverity } from './incidentTypes.js';

export const CLIENT_ERROR_DEDUPE_WINDOW_MS = 5 * 60 * 1000;
export const CLIENT_ERROR_INCIDENT_TYPE = 'system_errors';

export interface ClientErrorBody {
  error?: unknown;
  info?: Record<string, unknown>;
  message?: unknown;
  stack?: unknown;
  severity?: unknown;
  tenantId?: unknown;
  route?: unknown;
  build?: unknown;
  release?: unknown;
}

export interface IngestClientErrorContext {
  correlationId?: string;
  tenantId?: string;
  clientIp?: string;
  userAgent?: string;
  user?: { uid?: string; email?: string };
}

export type IngestClientErrorOutcome =
  | 'persisted'
  | 'deduped'
  | 'skipped_no_repo'
  | 'skipped_firestore_backoff';

export interface IngestClientErrorResult {
  outcome: IngestClientErrorOutcome;
  correlationId: string;
  incidentId?: string;
  dedupeKey: string;
  severity: IncidentSeverity;
  payload: Record<string, unknown>;
}

export interface BuildReleaseInfo {
  build: string;
  release: string;
}

export interface ClientErrorPipelineDeps {
  repo?: IncidentRepository;
  isFirestoreBackedOff?: () => boolean;
  dedupeCache?: Map<string, number>;
  now?: () => number;
  resolveBuildRelease?: () => BuildReleaseInfo;
}

type IncidentLogFn = (
  level: 'info' | 'warn' | 'error',
  message: string,
  meta?: Record<string, unknown>,
) => void;

let defaultDedupeCache = new Map<string, number>();
let cachedBuildRelease: BuildReleaseInfo | undefined;

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Extract the first meaningful stack frame for dedupe fingerprinting. */
export function extractFirstStackFrame(stack: unknown): string {
  const text = asString(stack);
  if (!text) return '';

  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith('Error:')) continue;
    if (line.startsWith('at ')) return line;
    if (line.includes('@')) return line;
  }
  return lines[0] ?? '';
}

/** Dedupe fingerprint: hash(message + route + first stack frame). */
export function buildClientErrorDedupeKey(message: string, route: string, stack: unknown): string {
  const fingerprint = `${message}\0${route}\0${extractFirstStackFrame(stack)}`;
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 32);
}

export function resolveBuildReleaseFromEnvAndFile(
  versionJsonPath = join(process.cwd(), 'public', 'version.json'),
): BuildReleaseInfo {
  if (cachedBuildRelease) return cachedBuildRelease;

  let build =
    asString(process.env.BUILD_SHA) ||
    asString(process.env.VITE_BUILD_ID) ||
    asString(process.env.RENDER_GIT_COMMIT)?.slice(0, 12) ||
    asString(process.env.VERCEL_GIT_COMMIT_SHA)?.slice(0, 12);

  if (!build && existsSync(versionJsonPath)) {
    try {
      const raw = readFileSync(versionJsonPath, 'utf8');
      const parsed = JSON.parse(raw) as { build?: unknown };
      build = asString(parsed.build);
    } catch {
      // fall through to local default
    }
  }

  const release =
    asString(process.env.RELEASE_VERSION) ||
    asString(process.env.npm_package_version) ||
    build ||
    'unknown';

  cachedBuildRelease = {
    build: build || 'unknown',
    release,
  };
  return cachedBuildRelease;
}

export function resetClientErrorPipelineCacheForTests(): void {
  defaultDedupeCache.clear();
  cachedBuildRelease = undefined;
}

function inferSeverity(body: ClientErrorBody, info: Record<string, unknown>): IncidentSeverity {
  const raw =
    asString(body.severity) ||
    asString(info.severity) ||
    asString(info.level);

  if (!raw) return 'error';
  const normalized = raw.toLowerCase();
  if (normalized === 'critical') return 'critical';
  if (normalized === 'warning' || normalized === 'warn') return 'warning';
  if (normalized === 'info') return 'info';
  return 'error';
}

function normalizeClientErrorInput(
  body: ClientErrorBody,
  ctx: IngestClientErrorContext,
): {
  message: string;
  route: string;
  stack?: string;
  tenantId: string;
  browser: string;
  severity: IncidentSeverity;
  build?: string;
  release?: string;
  user?: { uid?: string; email?: string };
  clientTimestamp?: string;
  info: Record<string, unknown>;
} {
  const info = (body.info && typeof body.info === 'object' ? body.info : {}) as Record<string, unknown>;

  const message =
    asString(body.error) ||
    asString(body.message) ||
    asString(info.message) ||
    'Client error';

  const route =
    asString(body.route) ||
    asString(info.route) ||
    asString(info.pathname) ||
    '';

  const stack =
    asString(body.stack) ||
    asString(info.stack) ||
    asString(info.stackTrace);

  const tenantId =
    ctx.tenantId ||
    asString(body.tenantId) ||
    asString(info.tenantId) ||
    'unknown';

  const browser =
    ctx.userAgent ||
    asString(info.userAgent) ||
    asString(info.browser) ||
    '';

  const user =
    ctx.user ||
    (asString(info.uid) || asString(info.userId) || asString(info.email)
      ? {
          uid: asString(info.uid) || asString(info.userId),
          email: asString(info.email),
        }
      : undefined);

  const clientTimestamp =
    asString(info.timestamp) ||
    asString(info.clientTimestamp) ||
    new Date().toISOString();

  return {
    message,
    route,
    stack,
    tenantId,
    browser,
    severity: inferSeverity(body, info),
    build: asString(body.build) || asString(info.build),
    release: asString(body.release) || asString(info.release),
    user,
    clientTimestamp,
    info,
  };
}

function pruneDedupeCache(cache: Map<string, number>, now: number): void {
  for (const [key, expiresAt] of cache) {
    if (expiresAt <= now) cache.delete(key);
  }
}

function isDuplicate(
  cache: Map<string, number>,
  dedupeKey: string,
  now: number,
): boolean {
  pruneDedupeCache(cache, now);
  const expiresAt = cache.get(dedupeKey);
  return expiresAt !== undefined && expiresAt > now;
}

function markDedupeSeen(cache: Map<string, number>, dedupeKey: string, now: number): void {
  cache.set(dedupeKey, now + CLIENT_ERROR_DEDUPE_WINDOW_MS);
}

/** Winston-compatible log hook for backward-compatible server logging. */
export function logClientErrorToWinston(
  log: IncidentLogFn,
  normalized: ReturnType<typeof normalizeClientErrorInput>,
  correlationId: string,
  body: ClientErrorBody,
): void {
  log('error', 'Client React Error', {
    error: normalized.message,
    info: body.info ?? {},
    correlationId,
    route: normalized.route,
    tenantId: normalized.tenantId,
    severity: normalized.severity,
  });
}

export async function ingestClientError(
  body: ClientErrorBody,
  ctx: IngestClientErrorContext = {},
  deps: ClientErrorPipelineDeps = {},
): Promise<IngestClientErrorResult> {
  const now = deps.now ?? Date.now;
  const cache = deps.dedupeCache ?? defaultDedupeCache;
  const correlationId = ctx.correlationId || `ce-${now()}`;
  const normalized = normalizeClientErrorInput(body, ctx);
  const buildRelease = deps.resolveBuildRelease?.() ?? resolveBuildReleaseFromEnvAndFile();

  const dedupeKey = buildClientErrorDedupeKey(normalized.message, normalized.route, normalized.stack);

  const payload: Record<string, unknown> = {
    error: normalized.message,
    message: normalized.message,
    route: normalized.route,
    tenantId: normalized.tenantId,
    browser: normalized.browser,
    userAgent: normalized.browser,
    stack: normalized.stack,
    severity: normalized.severity,
    timestamp: normalized.clientTimestamp,
    build: normalized.build || buildRelease.build,
    release: normalized.release || buildRelease.release,
    correlationId,
    dedupeKey,
    clientIp: ctx.clientIp,
    source: 'client_error_pipeline',
    info: normalized.info,
  };

  if (normalized.user?.uid) payload.uid = normalized.user.uid;
  if (normalized.user?.email) payload.email = normalized.user.email;
  if (normalized.user) payload.user = normalized.user;

  if (isDuplicate(cache, dedupeKey, now())) {
    return {
      outcome: 'deduped',
      correlationId,
      dedupeKey,
      severity: normalized.severity,
      payload,
    };
  }

  if (deps.isFirestoreBackedOff?.()) {
    return {
      outcome: 'skipped_firestore_backoff',
      correlationId,
      dedupeKey,
      severity: normalized.severity,
      payload,
    };
  }

  const repo = deps.repo;
  if (!repo) {
    return {
      outcome: 'skipped_no_repo',
      correlationId,
      dedupeKey,
      severity: normalized.severity,
      payload,
    };
  }

  const writeResult = await repo.writeIncident({
    type: CLIENT_ERROR_INCIDENT_TYPE,
    status: 'DETECTED',
    source: 'client',
    severity: normalized.severity,
    tenantId: normalized.tenantId,
    route: normalized.route,
    correlationId,
    payload,
    mirrorToClientErrors: true,
  });

  if (writeResult.skipped) {
    return {
      outcome: 'skipped_firestore_backoff',
      correlationId,
      dedupeKey,
      severity: normalized.severity,
      payload,
    };
  }

  markDedupeSeen(cache, dedupeKey, now());

  return {
    outcome: 'persisted',
    correlationId,
    incidentId: writeResult.incidentId,
    dedupeKey,
    severity: normalized.severity,
    payload,
  };
}
