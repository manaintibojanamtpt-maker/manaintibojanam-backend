/**
 * ReferenceSDK — base entity shape shared by all administrative DTOs.
 */

import type { ReferenceEntityKind } from '../types/branded';

/** Common fields for every reference entity in the hierarchy. */
export interface ReferenceEntityBase<TId extends string, TParentId extends string | null> {
  /** Stable SDK identifier (immutable across data releases). */
  readonly id: TId;
  /** Official government or postal code. */
  readonly officialCode: string;
  /** Human-readable label for UI display. */
  readonly displayName: string;
  /** Parent entity id; null only for root country nodes. */
  readonly parentId: TParentId;
  /** Whether this record is selectable in dropdowns and validation. */
  readonly active: boolean;
  /** Entity discriminator for logging and adapter routing. */
  readonly kind: ReferenceEntityKind;
}
