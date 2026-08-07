/**
 * Purpose: Defines extractable domain entities from a user utterance.
 * Public API: EntityType, entity variants, ConversationEntity union.
 * Dependencies: None
 * Consumers: Intent rules, EntityResolver / IEntityExtractor, ConversationState
 *
 * Rule-emitted structured values (Confirmation, OrderType) must live here so
 * IntentResolver / EntityResolver stay type-safe without `as any`.
 */

export type EntityType =
  | 'FoodItem'
  | 'Quantity'
  | 'Variant'
  | 'Size'
  | 'Drink'
  | 'Coupon'
  | 'Address'
  | 'Phone'
  | 'PaymentMethod'
  | 'Notes'
  | 'Restaurant'
  | 'Language'
  | 'Confirmation'
  | 'OrderType'
  | 'DeliveryTime';

export type OrderTypeValue = 'takeaway' | 'delivery' | 'dine_in';

/** ASAP vs a future delivery window — aligns with checkout deliveryType. */
export type DeliveryScheduleMode = 'asap' | 'scheduled';

export interface BaseEntity {
  readonly type: EntityType;
  readonly rawValue: string;
  readonly normalizedValue?: string;
  readonly confidence?: number;
  /** Optional span into the normalized transcript (inclusive start, exclusive end). */
  readonly startIndex?: number;
  readonly endIndex?: number;
}

export interface FoodItemEntity extends BaseEntity {
  readonly type: 'FoodItem';
  readonly menuItemId?: string;
}

export interface QuantityEntity extends BaseEntity {
  readonly type: 'Quantity';
  readonly numericValue: number;
}

export interface SizeEntity extends BaseEntity {
  readonly type: 'Size';
}

export interface VariantEntity extends BaseEntity {
  readonly type: 'Variant';
}

export interface AddressEntity extends BaseEntity {
  readonly type: 'Address';
}

/** Yes/no confirmation extracted from normalized "yes" / "no" tokens. */
export interface ConfirmationEntity extends BaseEntity {
  readonly type: 'Confirmation';
  readonly booleanValue: boolean;
}

/** Fulfillment mode (takeaway / delivery / dine-in). */
export interface OrderTypeEntity extends BaseEntity {
  readonly type: 'OrderType';
  readonly normalizedValue: OrderTypeValue;
}

/**
 * When the customer wants the order delivered.
 * Aligns with checkout `deliveryType` / `deliveryTimeSlot` / `scheduledFor` metadata
 * (no payment mutation — schedule fields only).
 */
export interface DeliveryTimeEntity extends BaseEntity {
  readonly type: 'DeliveryTime';
  readonly mode: DeliveryScheduleMode;
  /** Human label e.g. "8:00 PM", "tomorrow lunch". */
  readonly slotLabel?: string;
  /** Checkout-friendly slot hint e.g. "ASAP", "Today, 8:00 PM - 8:30 PM", "Tomorrow, Lunch". */
  readonly deliveryTimeSlot?: string;
  /** ISO timestamp hint when resolvable; omitted for ASAP / ambiguous meal bands. */
  readonly scheduledForHint?: string;
  /** True when user asked to schedule but time is missing/unclear. */
  readonly ambiguous?: boolean;
}

export type ConversationEntity =
  | FoodItemEntity
  | QuantityEntity
  | SizeEntity
  | VariantEntity
  | AddressEntity
  | ConfirmationEntity
  | OrderTypeEntity
  | DeliveryTimeEntity
  | BaseEntity;
