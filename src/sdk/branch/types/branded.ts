/**
 * BranchSDK — branded types (M5 PR-1 foundation).
 */

import type { IsoDateTime } from '../../core/types';

export type BranchId = string & { readonly __brand: 'BranchId' };
export type BranchAssignmentId = string & { readonly __brand: 'BranchAssignmentId' };
export type BranchTimestamp = IsoDateTime;

export type BranchStatusValue = 'draft' | 'active' | 'closed' | 'suspended';
export type BranchEligibilityStatus =
  | 'serviceable'
  | 'out_of_radius'
  | 'closed'
  | 'busy'
  | 'inventory_short'
  | 'suspended';
export type BranchOrderType = 'delivery' | 'pickup';
export type BranchCongestionLevel = 'low' | 'medium' | 'high' | 'critical';
export type BranchKitchenState = 'normal' | 'throttled' | 'paused';
