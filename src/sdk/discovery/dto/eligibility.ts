/**
 * DiscoverySDK — delivery eligibility DTO (read-only).
 */

export type DeliveryEligibilityStatus = 'serviceable' | 'out_of_radius' | 'closed' | 'unavailable';

export interface DeliveryEligibility {
  readonly status: DeliveryEligibilityStatus;
  readonly isServiceable: boolean;
  readonly distanceKm: number;
  readonly maxRadiusKm?: number;
  readonly estimatedFee?: number;
  readonly reason?: string;
}
