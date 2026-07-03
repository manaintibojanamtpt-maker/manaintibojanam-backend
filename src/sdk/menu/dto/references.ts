/**
 * MenuSDK — reference DTOs (M7 PR-1).
 */

export interface PriceReference {
  readonly amount: number;
  readonly currency: string;
}

export interface AvailabilityReference {
  readonly available: boolean;
  readonly reason?: string;
}

export interface BranchOverrideReference {
  readonly branchId: string;
  readonly price?: PriceReference;
  readonly availability?: AvailabilityReference;
}
