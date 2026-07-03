/**
 * LocationSDK — stub geo provider (M2 PR-6 / PR-7 composite).
 * Delegates to ProviderFactory stub registry.
 */

import { createCompositeLocationProvider } from './CompositeLocationProvider';
import type { LocationProvider } from './LocationProvider';
import { createDefaultLocationProviderRegistry } from './ProviderFactory';

export function createStubLocationProvider(): LocationProvider {
  return createCompositeLocationProvider(createDefaultLocationProviderRegistry());
}
