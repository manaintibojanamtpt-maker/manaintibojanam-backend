/**
 * OrderSDK factory — returns read-only adapter (M1 PR-3).
 */

import type { OrderSDK, OrderSDKFactory } from './OrderSDK';
import { createOrderApiAdapter } from './adapters/OrderApiAdapter';
import { defaultOrderApiPort } from './adapters/defaultOrderApiPort';
import type { OrderApiPort } from './adapters/OrderApiPort';

export const createOrderSDK = (port: OrderApiPort = defaultOrderApiPort): OrderSDK =>
  createOrderApiAdapter(port);

export const orderSdkFactory: OrderSDKFactory = {
  create: () => createOrderSDK(),
};
