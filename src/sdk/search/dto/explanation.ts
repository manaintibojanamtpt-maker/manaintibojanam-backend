/**
 * SearchSDK — explainable search breakdown DTOs (M4 foundation).
 */

import type { SearchMatchType } from '../types/branded';

export interface SearchExplanation {
  readonly matchType: SearchMatchType;
  readonly field: string;
  readonly signal: number;
  readonly weight: number;
  readonly contribution: number;
  readonly label: string;
}

export interface SearchMatchExplanation {
  readonly score: number;
  readonly rank: number;
  readonly factors: readonly SearchExplanation[];
}

export interface SearchHighlight {
  readonly field: string;
  readonly snippet: string;
}
