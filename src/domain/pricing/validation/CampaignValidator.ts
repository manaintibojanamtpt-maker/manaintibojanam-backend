/**
 * Pricing domain — Campaign validator facade (M8 PR-2).
 */

import {
  validateCampaign,
  validateCampaignEligibility,
  validateCampaignWindow,
} from '../campaign/CampaignValidation';
import type { Campaign, CampaignEligibility, CampaignWindow } from '../campaign/Campaign';
import type { PricingDomainValidationResult } from '../shared/PricingDomainResult';

export class CampaignValidator {
  validate(campaign: Campaign, nowIso?: string): PricingDomainValidationResult {
    return validateCampaign(campaign, nowIso);
  }

  validateWindow(window: CampaignWindow): PricingDomainValidationResult {
    return validateCampaignWindow(window);
  }

  validateEligibility(eligibility: CampaignEligibility): PricingDomainValidationResult {
    return validateCampaignEligibility(eligibility);
  }
}

export const campaignValidator = new CampaignValidator();
