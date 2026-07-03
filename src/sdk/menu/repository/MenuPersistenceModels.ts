/**
 * MenuSDK — persistence record models (M7 PR-3).
 * Pure persistence shapes — no Firestore types, no domain imports.
 */

export interface PriceRecord {
  readonly amount: number;
  readonly currency: string;
}

export interface AvailabilityRecord {
  readonly available: boolean;
  readonly reason?: string;
}

export interface BranchOverrideRecord {
  readonly branchId: string;
  readonly price?: PriceRecord;
  readonly availability?: AvailabilityRecord;
}

export interface CategoryRecord {
  readonly categoryId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description?: string;
  readonly sortOrder: number;
  readonly itemIds: readonly string[];
  readonly active: boolean;
}

export interface MenuItemRecord {
  readonly itemId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description?: string;
  readonly kind: string;
  readonly categoryId: string;
  readonly price: PriceRecord;
  readonly availability: AvailabilityRecord;
  readonly branchOverrides?: readonly BranchOverrideRecord[];
  readonly modifierGroupIds?: readonly string[];
  readonly tags?: readonly string[];
  readonly active: boolean;
}

export interface ModifierRecord {
  readonly modifierId: string;
  readonly name: string;
  readonly price: PriceRecord;
  readonly active: boolean;
}

export interface ModifierGroupRecord {
  readonly groupId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly required: boolean;
  readonly minSelections: number;
  readonly maxSelections: number;
  readonly modifiers: readonly ModifierRecord[];
}

export interface ComboComponentRecord {
  readonly itemId: string;
  readonly quantity: number;
}

export interface ComboRecord {
  readonly comboId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description?: string;
  readonly components: readonly ComboComponentRecord[];
  readonly price: PriceRecord;
  readonly availability: AvailabilityRecord;
  readonly active: boolean;
}

export interface MenuRecord {
  readonly menuId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly version: string;
  readonly updatedAt: string;
  readonly metadataSource: string;
  readonly metadataSchemaVersion: string;
}

export interface MenuSearchRecordHit {
  readonly item: MenuItemRecord;
  readonly score: number;
  readonly matchedFields: readonly string[];
}

export interface MenuSearchRecordResult {
  readonly hits: readonly MenuSearchRecordHit[];
  readonly categories: readonly CategoryRecord[];
  readonly totalHits: number;
  readonly queryText: string;
}
