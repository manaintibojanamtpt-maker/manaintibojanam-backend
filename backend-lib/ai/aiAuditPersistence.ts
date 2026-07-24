import type { Firestore } from 'firebase-admin/firestore';
import type { AiAuditEvent } from './auditContracts.js';
import { AiAuditEventRepository } from './aiAuditEventRepository.js';
import { readAiAuditPersistenceConfig } from './aiAuditPersistenceConfig.js';

type LoggerLike = {
  info: (payload: Record<string, unknown>) => void;
  warn: (payload: Record<string, unknown>) => void;
  error: (payload: Record<string, unknown>) => void;
};

export interface ConfigureAiAuditPersistenceParams {
  readonly db?: Firestore;
  readonly isBackedOff?: () => boolean;
  readonly onQuotaError?: (source: string) => void;
  readonly isQuotaError?: (err: unknown) => boolean;
  readonly log?: LoggerLike;
}

let repository: AiAuditEventRepository | null = null;
let configuredLog: LoggerLike | undefined;

export function configureAiAuditPersistence(params: ConfigureAiAuditPersistenceParams): void {
  configuredLog = params.log;
  if (!params.db) {
    repository = null;
    return;
  }
  repository = new AiAuditEventRepository({
    db: params.db,
    isBackedOff: params.isBackedOff,
    onQuotaError: params.onQuotaError,
    isQuotaError: params.isQuotaError,
    log: (level, message, meta) => {
      params.log?.[level]({ message, ...(meta ?? {}) });
    },
  });
}

export function getAiAuditEventRepository(): AiAuditEventRepository | null {
  return repository;
}

export function resetAiAuditPersistenceForTests(): void {
  repository = null;
  configuredLog = undefined;
}

/**
 * Fire-and-forget durable write. Never throws to callers.
 * No-op when flag OFF, repo unconfigured, or Firestore backed off.
 */
export function schedulePersistAiAuditEvent(event: AiAuditEvent): void {
  if (!readAiAuditPersistenceConfig().enabled) return;
  if (!repository) return;

  void repository.writeEvent(event).then((result) => {
    if (result.skipped && result.skipped !== 'firestore_quota_backoff') {
      configuredLog?.warn({
        message: 'AI audit persist skipped',
        skipped: result.skipped,
        eventType: event.eventType,
        correlationId: event.correlationId,
      });
    }
  });
}
