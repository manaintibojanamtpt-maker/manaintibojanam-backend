/**
 * BhojanOS SDK — persistence repository contract (infrastructure-agnostic).
 * Concrete adapters (HTTP, legacy bridge, etc.) are implemented outside this module.
 */

import type { SdkAsyncResult } from '../core/result';

export interface RepositoryQuery {
  readonly filters?: Readonly<Record<string, unknown>>;
  readonly orderBy?: Readonly<{ field: string; direction: 'asc' | 'desc' }>;
  readonly limit?: number;
}

export interface RepositoryAdapter<TEntity, TId extends string = string> {
  findById(id: TId): SdkAsyncResult<TEntity | null>;
  findMany(query?: RepositoryQuery): SdkAsyncResult<TEntity[]>;
}

export interface RepositoryAdapterFactory {
  createOrderRepository(): RepositoryAdapter<unknown, string>;
}
