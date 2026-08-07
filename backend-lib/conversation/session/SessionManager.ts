/**
 * Purpose: Lifecycle management of conversation sessions.
 * Public API: SessionManager interface and in-memory implementation for Phase 1.
 * Dependencies: SessionContext, ConversationRepository
 * Consumers: ConversationEngine
 * Future phases: Distributed caching (Redis) and advanced expiration policies.
 */

import type { SessionContext } from './SessionContext.js';
import type { ConversationSnapshot } from '../models/ConversationSnapshot.js';
import type { ConversationRepository } from './ConversationRepository.js';
import { ConversationStatus } from '../models/ConversationState.js';

export interface ISessionManager {
  createSession(tenantId: string, customerId?: string): Promise<SessionContext>;
  /** Load or create a session with a caller-provided id (bridges assist conversationId). */
  ensureSession(sessionId: string, tenantId: string, customerId?: string): Promise<SessionContext>;
  loadSession(sessionId: string): Promise<SessionContext | null>;
  updateSession(sessionId: string, snapshot: ConversationSnapshot): Promise<void>;
  closeSession(sessionId: string): Promise<void>;
  expireSession(sessionId: string): Promise<void>;
}

/**
 * Phase 1 In-Memory implementation of ConversationRepository.
 * Safe for single-process Node environments. Not for production multi-tenant scaling.
 */
export class InMemoryConversationRepository implements ConversationRepository {
  private store = new Map<string, ConversationSnapshot>();

  async save(snapshot: ConversationSnapshot): Promise<void> {
    this.store.set(snapshot.state.sessionId, snapshot);
  }

  async findById(sessionId: string): Promise<ConversationSnapshot | null> {
    return this.store.get(sessionId) || null;
  }

  async delete(sessionId: string): Promise<void> {
    this.store.delete(sessionId);
  }
}

/**
 * Phase 1 SessionManager implementation.
 */
export class SessionManager implements ISessionManager {
  constructor(private readonly repository: ConversationRepository) {}

  async createSession(tenantId: string, customerId?: string): Promise<SessionContext> {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return this.ensureSession(sessionId, tenantId, customerId);
  }

  async ensureSession(
    sessionId: string,
    tenantId: string,
    customerId?: string,
  ): Promise<SessionContext> {
    const existing = await this.loadSession(sessionId);
    if (existing) return existing;

    const now = Date.now();
    const snapshot: ConversationSnapshot = {
      snapshotId: `snap_${now}`,
      timestamp: now,
      recentSteps: [],
      state: {
        sessionId,
        conversationId: sessionId,
        tenantId,
        customerId,
        currentLanguage: 'en-IN',
        currentIntent: null,
        detectedEntities: [],
        currentWorkflowStep: null,
        pendingQuestion: null,
        pendingConfirmation: false,
        currentCartReference: null,
        status: ConversationStatus.Idle,
        createdTime: now,
        updatedTime: now,
        metadata: {},
        historyReference: null,
      },
    };

    await this.repository.save(snapshot);

    return {
      sessionId,
      tenantId,
      customerId,
      snapshot,
    };
  }

  async loadSession(sessionId: string): Promise<SessionContext | null> {
    const snapshot = await this.repository.findById(sessionId);
    if (!snapshot) return null;

    return {
      sessionId: snapshot.state.sessionId,
      tenantId: snapshot.state.tenantId,
      customerId: snapshot.state.customerId,
      snapshot,
    };
  }

  async updateSession(sessionId: string, snapshot: ConversationSnapshot): Promise<void> {
    const existing = await this.repository.findById(sessionId);
    if (!existing) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    await this.repository.save({
      ...snapshot,
      state: {
        ...snapshot.state,
        sessionId,
      },
    });
  }

  async closeSession(sessionId: string): Promise<void> {
    const snapshot = await this.repository.findById(sessionId);
    if (snapshot) {
      await this.repository.save({
        ...snapshot,
        state: {
          ...snapshot.state,
          status: ConversationStatus.Completed,
          updatedTime: Date.now(),
        }
      });
    }
  }

  async expireSession(sessionId: string): Promise<void> {
    const snapshot = await this.repository.findById(sessionId);
    if (snapshot) {
      await this.repository.save({
        ...snapshot,
        state: {
          ...snapshot.state,
          status: ConversationStatus.TimedOut,
          updatedTime: Date.now(),
        }
      });
    }
  }
}
