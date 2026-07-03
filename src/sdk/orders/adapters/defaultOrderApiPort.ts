/**
 * Default OrderApiPort — binds to src/services/api.ts read helpers.
 */

import {
  fetchOrderByIdApi,
  fetchOrders,
  requestGuestViewToken,
} from '../../../services/api';
import type { OrderApiPort } from './OrderApiPort';

export const defaultOrderApiPort: OrderApiPort = {
  fetchOrderByIdApi: (orderId) => fetchOrderByIdApi(orderId),
  fetchOrders: (userId) => fetchOrders(userId),
  requestGuestViewToken: (orderId, input) => requestGuestViewToken(orderId, input),
};
