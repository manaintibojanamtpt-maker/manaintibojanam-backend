/**
 * Branch domain — constants (M5 PR-2).
 */

export const BRANCH_DOMAIN_VERSION = '0.1.0-foundation' as const;

export const BRANCH_SCORE_MIN = 0;
export const BRANCH_SCORE_MAX = 1;

export const BRANCH_WEIGHT_SUM_TOLERANCE = 0.0001;

export const BRANCH_DEFAULT_MAX_RADIUS_KM = 10;

export const BRANCH_DEFAULT_MAX_ETA_MINS = 90;

export const BRANCH_DEFAULT_MAX_DELIVERY_FEE = 200;

export const BRANCH_MIN_INVENTORY_COVERAGE = 1;

export const BRANCH_TIE_BREAK_STRATEGY = 'branch_id_asc' as const;

export type BranchTieBreakStrategy = typeof BRANCH_TIE_BREAK_STRATEGY;
