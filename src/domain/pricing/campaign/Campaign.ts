/**
 * Domain — Campaign types (M8 PR-2).
 * Validation only — no execution engine.
 */

import type { PricingTenantId } from '../shared/PricingDomainTypes';
import type { PricingTimeWindow } from '../shared/PricingDomainTypes';

export interface CampaignWindow extends PricingTimeWindow {
  readonly timezone?: string;
}

export interface CampaignEligibility {
  readonly tenantId: PricingTenantId;
  readonly branchIds?: readonly string[];
  readonly customerSegments?: readonly string[];
}

export interface Campaign {
  readonly campaignId: string;
  readonly name: string;
  readonly window: CampaignWindow;
  readonly eligibility: CampaignEligibility;
  readonly enabled: boolean;
  readonly active: boolean;
}
