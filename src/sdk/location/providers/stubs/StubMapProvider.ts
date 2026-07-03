/**
 * LocationSDK — stub map provider (M2 PR-7).
 * No MapLibre or DOM access.
 */

import { sdkError, sdkFail, sdkOk } from '../../../core/resultHelpers';
import type { MapProvider } from '../MapProvider';
import type { GeoPoint } from '../../dto/geo';
import type { MapPinOptions } from '../../dto/map';

const DEFAULT_INDIA_CENTER = { lat: 20.5937, lng: 78.9629 } as const;
const DEFAULT_ZOOM = 5;

export function createStubMapProvider(): MapProvider {
  return {
    kind: 'stub',
    getDefaultViewport: (options?: MapPinOptions) =>
      sdkOk({
        center: options?.initialCenter ?? DEFAULT_INDIA_CENTER,
        zoom: options?.initialZoom ?? DEFAULT_ZOOM,
      }),
    validatePinPlacement: (point: GeoPoint) =>
      sdkFail(
        sdkError('NOT_CONFIGURED', 'validatePinPlacement is not configured on StubMapProvider', {
          locationCode: 'NOT_CONFIGURED',
          field: `${point.lat},${point.lng}`,
        })
      ),
  };
}
