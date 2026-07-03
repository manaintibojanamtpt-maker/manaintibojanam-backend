/**
 * M1 PR-4 — OrderTracking read paths (api.ts vs OrderSDK behind FF_SDK_ORDERTRACKING_ENABLED).
 */

import { createOrderSDK } from '../sdk/orders/createOrderSDK';
import type { OrderId } from '../sdk/core/types';
import type { GuestViewTokenInput } from '../sdk/orders/types';
import {
  fetchOrderByIdApi,
  requestGuestViewToken,
  type GuestViewTokenInput as ApiGuestViewTokenInput,
  type GuestViewTokenResult as ApiGuestViewTokenResult,
} from '../services/api';
import { isSdkOrderTrackingEnabled } from './sdkFeatureFlags';

export type OrderTrackingSnapshot = Record<string, unknown>;

export async function fetchOrderForTracking(
  orderId: string
): Promise<OrderTrackingSnapshot | null> {
  if (!isSdkOrderTrackingEnabled()) {
    const order = await fetchOrderByIdApi(orderId);
    return order ? (order as unknown as OrderTrackingSnapshot) : null;
  }

  const sdk = createOrderSDK();
  const result = await sdk.getOrderById(orderId as OrderId);
  if (!result.ok) {
    return null;
  }

  return { ...result.value } as OrderTrackingSnapshot;
}

export async function requestGuestViewTokenForTracking(
  orderId: string,
  input: ApiGuestViewTokenInput
): Promise<ApiGuestViewTokenResult> {
  if (!isSdkOrderTrackingEnabled()) {
    return requestGuestViewToken(orderId, input);
  }

  const sdk = createOrderSDK();
  const sdkInput: GuestViewTokenInput = input;
  const result = await sdk.requestGuestViewToken(orderId as OrderId, sdkInput);

  if (result.ok === false) {
    return {
      success: false,
      error: result.error.message,
    };
  }

  return {
    success: true,
    token: result.value.token,
    expiresAt: result.value.expiresAt,
  };
}
