/**
 * MenuSDK — metadata DTOs (M7 PR-1).
 */

import type { MenuTimestamp } from '../types/branded';

export interface MenuMetadata {
  readonly source: string;
  readonly schemaVersion: string;
  readonly itemCount: number;
  readonly categoryCount: number;
  readonly generatedAt: MenuTimestamp;
}
