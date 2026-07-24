import { AI_EVAL_SCHEMA_VERSION } from '../aiEvalConfig.js';

export type GoldenCategory =
  | 'intent'
  | 'structured-output'
  | 'safety'
  | 'cart-plan-parse'
  | 'clarification'
  | 'triage'
  | 'personalization';

export interface GoldenCase {
  readonly id: string;
  readonly description?: string;
  readonly category: GoldenCategory;
  readonly input: Record<string, unknown>;
  readonly expect: Record<string, unknown>;
}

export interface GoldenFixtureFile {
  readonly schemaVersion: typeof AI_EVAL_SCHEMA_VERSION | string;
  readonly fixtureSetVersion: string;
  readonly category: GoldenCategory;
  readonly cases: readonly GoldenCase[];
}

export interface GoldenCaseResult {
  readonly id: string;
  readonly category: GoldenCategory;
  readonly ok: boolean;
  readonly errors: readonly string[];
}

export interface GoldenEvalReport {
  readonly schemaVersion: typeof AI_EVAL_SCHEMA_VERSION;
  readonly fixtureSetVersion: string;
  readonly mutatedState: false;
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly results: readonly GoldenCaseResult[];
}
