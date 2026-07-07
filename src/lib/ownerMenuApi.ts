import { ownerApiRequest } from './ownerProvisioning';
import type { MenuItem } from '../types';

export type MenuStockOperation = 'reserve' | 'release';

export type MenuStockSideEffect = 'autoLocked' | 'stockAlert' | 'itemRestocked';

export type MenuStockUpdateResponse = {
  success: boolean;
  id: string;
  skipped?: boolean;
  reason?: string;
  operation?: MenuStockOperation;
  quantity?: number;
  stockCount?: number;
  isAvailable?: boolean;
  sideEffects?: MenuStockSideEffect[];
};

export async function fetchOwnerMenuItems(tenantId: string) {
  return ownerApiRequest<{ success: boolean; tenantId: string; items: MenuItem[] }>(
    'GET',
    `/api/owner/menu/items?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function updateOwnerMenuItemStock(
  tenantId: string,
  menuItemId: string,
  operation: MenuStockOperation,
  quantity: number,
) {
  return ownerApiRequest<MenuStockUpdateResponse>(
    'PUT',
    `/api/owner/menu/items/${encodeURIComponent(menuItemId)}/stock`,
    { tenantId, operation, quantity },
  );
}
