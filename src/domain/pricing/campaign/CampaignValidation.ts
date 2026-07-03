/**
 * Domain — Campaign validation (M8 PR-2).
 */

import { PRICING_REASON_CODES } from '../shared/PricingReasonCodes';
import {
  mergePricingValidationResults,
  pricingValidationFailure,
  pricingValidationSuccess,
  type PricingDomainValidationResult,
} from '../shared/PricingDomainResult';
import type { Campaign, CampaignEligibility, CampaignWindow } from './Campaign';

const isOutsideWindow = (window: CampaignWindow, nowIso: string): boolean => {
  const now = Date.parse(nowIso);
  return now < Date.parse(window.startsAt) || now > Date.parse(window.endsAt);
};

export const validateCampaignWindow = (window: CampaignWindow): PricingDomainValidationResult => {
  const errors = [];
  if (!window.startsAt?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_CAMPAIGN,
      message: 'Campaign start time is required',
      field: 'startsAt',
    });
  }
  if (!window.endsAt?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_CAMPAIGN,
      message: 'Campaign end time is required',
      field: 'endsAt',
    });
  }
  if (
    window.startsAt &&
    window.endsAt &&
    Date.parse(window.startsAt) >= Date.parse(window.endsAt)
  ) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_CAMPAIGN,
      message: 'Campaign start must be before end',
      field: 'startsAt',
    });
  }
  return errors.length === 0 ? pricingValidationSuccess() : pricingValidationFailure(errors);
};

export const validateCampaignEligibility = (
  eligibility: CampaignEligibility
): PricingDomainValidationResult => {
  const errors = [];
  if (!eligibility.tenantId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_CAMPAIGN,
      message: 'Tenant id is required',
      field: 'tenantId',
    });
  }
  return errors.length === 0 ? pricingValidationSuccess() : pricingValidationFailure(errors);
};

export const validateCampaign = (
  campaign: Campaign,
  nowIso = new Date(0).toISOString()
): PricingDomainValidationResult => {
  const errors = [];
  if (!campaign.campaignId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_CAMPAIGN,
      message: 'Campaign id is required',
      field: 'campaignId',
    });
  }
  if (!campaign.name?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_CAMPAIGN,
      message: 'Campaign name is required',
      field: 'name',
    });
  }
  if (!campaign.enabled) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_CAMPAIGN,
      message: 'Campaign is not enabled',
      field: 'enabled',
    });
  }
  if (!campaign.active) {
    errors.push({
      code: PRICING_REASON_CODES.CAMPAIGN_INACTIVE,
      message: 'Campaign is inactive',
      field: 'active',
    });
  }
  if (isOutsideWindow(campaign.window, nowIso)) {
    errors.push({
      code: PRICING_REASON_CODES.CAMPAIGN_OUTSIDE_WINDOW,
      message: 'Campaign is outside its active window',
      field: 'window',
    });
  }
  if (errors.length > 0) {
    return pricingValidationFailure(errors);
  }
  return mergePricingValidationResults(
    validateCampaignWindow(campaign.window),
    validateCampaignEligibility(campaign.eligibility)
  );
};
