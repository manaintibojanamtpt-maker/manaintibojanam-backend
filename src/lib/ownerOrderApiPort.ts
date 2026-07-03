/**
 * M1B PR-1 — OrderApiPort binding for owner reads (extends default port, no api.ts changes).
 */

import { defaultOrderApiPort } from '../sdk/orders/adapters/defaultOrderApiPort';
import type { OrderApiPort } from '../sdk/orders/adapters/OrderApiPort';
import { fetchOrdersByTenant } from './ownerOrderFetch';

export const ownerOrderApiPort: OrderApiPort = {
  ...defaultOrderApiPort,
  fetchOrdersByTenant,
};
