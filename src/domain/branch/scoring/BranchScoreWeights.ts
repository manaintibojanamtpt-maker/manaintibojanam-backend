/**
 * Branch domain — scoring weights (M5 PR-2).
 */

import { BRANCH_WEIGHT_SUM_TOLERANCE } from '../shared/BranchConstants';
import type { BranchScoreSignal } from '../shared/BranchTypes';

export const BRANCH_DOMAIN_SCORE_WEIGHTS = {
  distance: 0.35,
  eta: 0.25,
  delivery_fee: 0.1,
  capacity_headroom: 0.15,
  inventory_availability: 0.1,
  rating: 0,
  open_status: 0.05,
} as const;

export type BranchScoreWeightKey = keyof typeof BRANCH_DOMAIN_SCORE_WEIGHTS;

export const ACTIVE_BRANCH_SCORE_WEIGHT_KEYS: readonly BranchScoreWeightKey[] = [
  'distance',
  'eta',
  'delivery_fee',
  'capacity_headroom',
  'inventory_availability',
  'rating',
  'open_status',
] as const;

export const BRANCH_SCORE_SIGNAL_ORDER: readonly BranchScoreSignal[] = [
  'distance',
  'eta',
  'delivery_fee',
  'capacity_headroom',
  'inventory_availability',
  'rating',
  'open_status',
] as const;

export type BranchScoreWeights = typeof BRANCH_DOMAIN_SCORE_WEIGHTS;

export const sumBranchScoreWeights = (
  weights: BranchScoreWeights = BRANCH_DOMAIN_SCORE_WEIGHTS
): number =>
  ACTIVE_BRANCH_SCORE_WEIGHT_KEYS.reduce((sum, key) => sum + weights[key], 0);

export const validateBranchScoreWeights = (
  weights: BranchScoreWeights = BRANCH_DOMAIN_SCORE_WEIGHTS
): boolean => Math.abs(sumBranchScoreWeights(weights) - 1) < BRANCH_WEIGHT_SUM_TOLERANCE;
