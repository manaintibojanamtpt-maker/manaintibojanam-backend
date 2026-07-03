import type { CorrelationId, CausationId } from '../types/branded';
import type { TenantId } from '../../core/types';

/** Cross-cutting event metadata — correlation, causation, tracing, tenancy. */
export interface EventMetadata {
  readonly tenantId?: TenantId;
  readonly correlationId: CorrelationId;
  readonly causationId?: CausationId;
  readonly traceId?: string;
  readonly source?: string;
  readonly idempotencyKey?: string;
  readonly publishedAt?: string;
  readonly custom?: Readonly<Record<string, string>>;
}
