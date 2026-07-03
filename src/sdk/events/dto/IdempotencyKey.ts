/** Branded idempotency key for publish/consume deduplication. */
export type IdempotencyKey = string & { readonly __brand: 'IdempotencyKey' };

export const asIdempotencyKey = (value: string): IdempotencyKey => value as IdempotencyKey;
