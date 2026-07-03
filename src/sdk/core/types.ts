/**
 * BhojanOS SDK — core shared types (contracts only).
 * Infrastructure-agnostic identifiers and primitives.
 */

/** Branded string IDs for compile-time safety at SDK boundaries. */
export type EntityId = string & { readonly __brand: 'EntityId' };
export type TenantId = string & { readonly __brand: 'TenantId' };
export type OrderId = string & { readonly __brand: 'OrderId' };
export type UserId = string & { readonly __brand: 'UserId' };

/** ISO-8601 timestamp string used across SDK read models. */
export type IsoDateTime = string & { readonly __brand: 'IsoDateTime' };

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
}

export interface SdkMetadata {
  sdkVersion: string;
  requestId?: string;
}
