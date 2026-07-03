/**
 * LocationSDK — delivery configuration read DTOs.
 */

export interface DeliveryConfigReadModel {
  readonly enabled: boolean;
  readonly freeRadiusKm: number;
  readonly paidRadiusKm: number;
  readonly maxRadiusKm: number;
  readonly baseFee: number;
  readonly perKmCharge: number;
  readonly prepTimeMins: number;
  readonly feesConfigured?: boolean;
  readonly freeDeliveryMinOrder?: number;
}

export interface ServiceabilityResult {
  readonly isServiceable: boolean;
  readonly distanceKm: number;
  readonly deliveryFee: number;
  readonly reason?: 'OUT_OF_RADIUS' | 'PINCODE_BLOCKED' | 'STORE_CLOSED';
  readonly zoneMatched?: string;
}

export interface EtaEstimate {
  readonly prepTimeMins: number;
  readonly travelTimeMins: number;
  readonly totalMins: number;
  readonly display: string;
}
