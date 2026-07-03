/**
 * Domain — Offer validation (M8 PR-2).
 */

import { PRICING_REASON_CODES } from '../shared/PricingReasonCodes';
import {
  mergePricingValidationResults,
  pricingValidationFailure,
  pricingValidationSuccess,
  type PricingDomainValidationResult,
} from '../shared/PricingDomainResult';
import type { Offer, OfferRule } from './Offer';

const VALID_KINDS = new Set(['percentage', 'fixed', 'buy_x_get_y']);
const VALID_PRIORITIES = new Set(['low', 'normal', 'high']);

export const validateOfferRule = (rule: OfferRule): PricingDomainValidationResult => {
  const errors = [];
  if (!rule.ruleId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_OFFER_RULE,
      message: 'Rule id is required',
      field: 'ruleId',
    });
  }
  if (!VALID_KINDS.has(rule.kind)) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_OFFER_RULE,
      message: 'Offer kind must be percentage, fixed, or buy_x_get_y',
      field: 'kind',
    });
  }
  if (!Number.isFinite(rule.value) || rule.value < 0) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_OFFER_RULE,
      message: 'Offer value must be non-negative',
      field: 'value',
    });
  }
  if (rule.kind === 'percentage' && rule.value > 100) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_OFFER_RULE,
      message: 'Percentage offer cannot exceed 100',
      field: 'value',
    });
  }
  if (rule.kind === 'buy_x_get_y') {
    if (!Number.isInteger(rule.buyQuantity) || (rule.buyQuantity ?? 0) <= 0) {
      errors.push({
        code: PRICING_REASON_CODES.INVALID_OFFER_RULE,
        message: 'Buy quantity must be a positive integer',
        field: 'buyQuantity',
      });
    }
    if (!Number.isInteger(rule.getQuantity) || (rule.getQuantity ?? 0) <= 0) {
      errors.push({
        code: PRICING_REASON_CODES.INVALID_OFFER_RULE,
        message: 'Get quantity must be a positive integer',
        field: 'getQuantity',
      });
    }
  }
  return errors.length === 0 ? pricingValidationSuccess() : pricingValidationFailure(errors);
};

export const validateOffer = (offer: Offer): PricingDomainValidationResult => {
  const errors = [];
  if (!offer.offerId?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_OFFER,
      message: 'Offer id is required',
      field: 'offerId',
    });
  }
  if (!offer.name?.trim()) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_OFFER,
      message: 'Offer name is required',
      field: 'name',
    });
  }
  if (!VALID_PRIORITIES.has(offer.priority)) {
    errors.push({
      code: PRICING_REASON_CODES.INVALID_OFFER,
      message: 'Offer priority must be low, normal, or high',
      field: 'priority',
    });
  }
  if (!offer.active) {
    errors.push({
      code: PRICING_REASON_CODES.OFFER_INACTIVE,
      message: 'Offer is inactive',
      field: 'active',
    });
  }
  if (errors.length > 0) {
    return pricingValidationFailure(errors);
  }
  return mergePricingValidationResults(validateOfferRule(offer.rule));
};
