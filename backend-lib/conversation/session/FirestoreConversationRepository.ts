/**
 * Purpose: Firebase Firestore implementation for durable session management.
 * Public API: FirestoreConversationRepository class
 * Dependencies: ConversationSnapshot, ConversationSnapshotRedactor
 * Consumers: SessionManager
 */

import type { Firestore } from 'firebase-admin/firestore';
import type { ConversationRepository } from './ConversationRepository.js';
import type { ConversationSnapshot } from '../models/ConversationSnapshot.js';
import { ConversationSnapshotRedactor } from './ConversationSnapshotRedactor.js';
import { ConversationStatus } from '../models/ConversationState.js';

export class FirestoreConversationRepository implements ConversationRepository {
  private readonly collectionName = 'conversationSessions';
  private readonly redactor = new ConversationSnapshotRedactor();
  
  // 2 hours TTL in milliseconds
  private readonly TTL_MS = 2 * 60 * 60 * 1000;

  constructor(private readonly db: Firestore) {}

  async save(snapshot: ConversationSnapshot): Promise<void> {
    const { snapshot: redactedSnapshot, summary } = this.redactor.redact(snapshot);
    const state = redactedSnapshot.state;
    const now = Date.now();

    const docRef = this.db.collection(this.collectionName).doc(state.sessionId);

    // Strict schema enforcement as approved in Phase 2
    const docData = {
      sessionId: state.sessionId,
      conversationId: state.conversationId,
      tenantId: state.tenantId,
      restaurantId: state.restaurantId || null,
      customerId: state.customerId || null,
      language: state.currentLanguage,
      status: state.status,
      currentIntent: state.currentIntent || null,
      workflowStep: state.currentWorkflowStep || null,
      pendingQuestion: state.pendingQuestion || null,
      pendingConfirmation: state.pendingConfirmation,
      cartReference: state.currentCartReference || null,
      snapshot: JSON.parse(JSON.stringify(redactedSnapshot)), // Plain JS object for Firestore
      metadata: state.metadata,
      createdAt: state.createdTime,
      updatedAt: now,
      expiresAt: now + this.TTL_MS,
      schemaVersion: '1.0',
      redactionSummary: summary, // Added for observability as requested
    };

    // Note: We're setting merge: true so we don't accidentally blow away createdAt
    // if this is an update to an existing doc.
    await docRef.set(docData, { merge: true });
  }

  async findById(sessionId: string): Promise<ConversationSnapshot | null> {
    const docRef = this.db.collection(this.collectionName).doc(sessionId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return null;
    }

    const data = docSnap.data();
    if (!data || !data.snapshot) {
      return null;
    }

    return data.snapshot as ConversationSnapshot;
  }

  async delete(sessionId: string): Promise<void> {
    const docRef = this.db.collection(this.collectionName).doc(sessionId);
    await docRef.delete();
  }
}
