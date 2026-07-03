/**
 * MenuSDK branded types (M7 PR-1).
 */

import type { IsoDateTime, TenantId } from '../../core/types';

export type MenuItemId = string & { readonly __brand: 'MenuItemId' };
export type MenuCategoryId = string & { readonly __brand: 'MenuCategoryId' };
export type ModifierGroupId = string & { readonly __brand: 'ModifierGroupId' };
export type ModifierId = string & { readonly __brand: 'ModifierId' };
export type ComboId = string & { readonly __brand: 'ComboId' };
export type MenuId = string & { readonly __brand: 'MenuId' };

export type MenuProviderKind = 'stub' | 'firestore' | 'projection';

export type MenuItemKind = 'item' | 'combo' | 'modifier';

export type MenuTimestamp = IsoDateTime;

export type MenuTenantScope = {
  readonly tenantId: TenantId;
};
