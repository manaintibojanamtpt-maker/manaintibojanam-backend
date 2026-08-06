/**
 * Purpose: Aggregates all context required for a single session execution.
 * Public API: SessionContext interface
 * Dependencies: ConversationSnapshot
 * Consumers: SessionManager, ConversationEngine
 * Future phases: Expanding context with user profiles, CRM data, and live restaurant context.
 */

import type { ConversationSnapshot } from '../models/ConversationSnapshot.js';

export interface SessionContext {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly customerId?: string;
  readonly snapshot: ConversationSnapshot;
  // Future: user profile, preferences, active order, etc.
}
