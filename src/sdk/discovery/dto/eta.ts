/**
 * DiscoverySDK — ETA estimate DTO (read-only).
 */

export interface ETAEstimate {
  readonly prepTimeMins: number;
  readonly deliveryTimeMins: number;
  readonly totalMins: number;
}
