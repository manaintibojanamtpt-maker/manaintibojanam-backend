/**
 * Menu domain — shared types (M7 PR-2).
 */

export type MenuDomainItemKind = 'item' | 'combo' | 'modifier' | 'bundle';

export type MenuDomainEntityId = string;

export interface MenuDomainTenantScope {
  readonly tenantId: string;
}

export interface MenuDomainNamedEntity {
  readonly name: string;
}

export interface MenuDomainActivatable {
  readonly active: boolean;
}
