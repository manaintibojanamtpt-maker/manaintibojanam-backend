/**
 * Purpose: Data access abstraction for session persistence.
 * Public API: ConversationRepository interface
 * Dependencies: ConversationSnapshot
 * Consumers: SessionManager
 * Future phases: Firestore or Redis implementation for distributed state storage.
 */

import type { ConversationSnapshot } from '../models/ConversationSnapshot.js';

export interface ConversationRepository {
  save(snapshot: ConversationSnapshot): Promise<void>;
  findById(sessionId: string): Promise<ConversationSnapshot | null>;
  delete(sessionId: string): Promise<void>;
}
