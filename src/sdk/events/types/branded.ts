/**
 * EventSDK — branded types (M6 PR-1).
 */

export type EventId = string & { readonly __brand: 'EventId' };
export type OutboxId = string & { readonly __brand: 'OutboxId' };
export type SubscriptionId = string & { readonly __brand: 'SubscriptionId' };
export type AggregateId = string & { readonly __brand: 'AggregateId' };
export type CorrelationId = string & { readonly __brand: 'CorrelationId' };
export type CausationId = string & { readonly __brand: 'CausationId' };
export type EventTypeName = string & { readonly __brand: 'EventTypeName' };
export type SchemaVersion = string & { readonly __brand: 'SchemaVersion' };

export const asEventId = (value: string): EventId => value as EventId;
export const asOutboxId = (value: string): OutboxId => value as OutboxId;
export const asSubscriptionId = (value: string): SubscriptionId => value as SubscriptionId;
export const asAggregateId = (value: string): AggregateId => value as AggregateId;
export const asCorrelationId = (value: string): CorrelationId => value as CorrelationId;
export const asCausationId = (value: string): CausationId => value as CausationId;
export const asEventTypeName = (value: string): EventTypeName => value as EventTypeName;
export const asSchemaVersion = (value: string): SchemaVersion => value as SchemaVersion;
