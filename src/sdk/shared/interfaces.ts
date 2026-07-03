/**
 * BhojanOS SDK — cross-module interfaces.
 */

import type { FeatureFlagReader } from '../core/featureFlags';
import type { SdkMetadata } from '../core/types';
import type { OrderSDK } from '../orders/OrderSDK';

export interface SdkContext {
  readonly metadata: SdkMetadata;
  readonly featureFlags: FeatureFlagReader;
}

export interface BhojanSdk {
  readonly orders: OrderSDK;
  readonly context: SdkContext;
}

export interface BhojanSdkFactory {
  create(): BhojanSdk;
}
