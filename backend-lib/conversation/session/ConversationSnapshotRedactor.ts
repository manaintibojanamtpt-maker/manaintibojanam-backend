/**
 * Purpose: Redacts PII and sensitive data from Conversation Snapshots before persistence.
 * Public API: ConversationSnapshotRedactor class
 * Dependencies: ConversationSnapshot
 * Consumers: FirestoreConversationRepository
 */

import { createHash } from 'crypto';
import type { ConversationSnapshot } from '../models/ConversationSnapshot.js';
import type { ConversationStep } from '../models/ConversationStep.js';

export interface RedactionResult {
  readonly snapshot: ConversationSnapshot;
  readonly summary: Record<string, number>;
}

export interface RedactorPlugin {
  name: string;
  redactText(text: string, summary: Record<string, number>): string;
  redactEntities(entities: ConversationSnapshot['state']['detectedEntities'], summary: Record<string, number>): ConversationSnapshot['state']['detectedEntities'];
  redactMetadata(metadata: Record<string, unknown>, summary: Record<string, number>): Record<string, unknown>;
  redactIdentifiers(snapshot: ConversationSnapshot, summary: Record<string, number>): ConversationSnapshot;
}

export class RegexTextPlugin implements RedactorPlugin {
  name = 'RegexTextPlugin';

  private readonly PATTERNS = [
    { name: 'EMAIL', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
    { name: 'PHONE', regex: /(?:\+?91[\s-]?)?[6789]\d{9}/g },
    { name: 'JWT', regex: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g },
    { name: 'OPENAI_KEY', regex: /sk-[a-zA-Z0-9]{48}/g },
    { name: 'GOOGLE_KEY', regex: /AIza[0-9A-Za-z-_]{35}/g },
    { name: 'BEARER_TOKEN', regex: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/g },
    { name: 'PRIVATE_KEY', regex: /-----BEGIN PRIVATE KEY-----[a-zA-Z0-9\s/+=]+-----END PRIVATE KEY-----/g },
    // Basic heuristic for Indian addresses: door numbers, street, pin codes.
    { name: 'ADDRESS', regex: /\b\d{1,5}[a-zA-Z/,-]*\s+(?:[a-zA-Z]+\s+){0,4}(?:street|st|road|rd|avenue|ave|lane|ln|nagar|colony|layout|block|phase|sector)\b|\b\d{6}\b/gi }
  ];

  redactText(text: string, summary: Record<string, number>): string {
    if (!text) return text;
    let redacted = text;
    for (const pattern of this.PATTERNS) {
      redacted = redacted.replace(pattern.regex, () => {
        summary[pattern.name] = (summary[pattern.name] || 0) + 1;
        return `[REDACTED_${pattern.name}]`;
      });
    }
    return redacted;
  }

  redactEntities(entities: ConversationSnapshot['state']['detectedEntities'], summary: Record<string, number>) { return entities; }
  redactMetadata(metadata: Record<string, unknown>, summary: Record<string, number>) { return metadata; }
  redactIdentifiers(snapshot: ConversationSnapshot, summary: Record<string, number>) { return snapshot; }
}

export class EntityPlugin implements RedactorPlugin {
  name = 'EntityPlugin';
  
  redactText(text: string, summary: Record<string, number>) { return text; }
  
  redactEntities(entities: ConversationSnapshot['state']['detectedEntities'], summary: Record<string, number>) {
    return entities.map(entity => {
      if (entity.type === 'Address' || entity.type === 'Phone') {
        const key = `ENTITY_${entity.type.toUpperCase()}`;
        summary[key] = (summary[key] || 0) + 1;
        return {
          ...entity,
          rawValue: `[REDACTED_${entity.type.toUpperCase()}]`,
          normalizedValue: `[REDACTED_${entity.type.toUpperCase()}]`,
        };
      }
      return entity;
    });
  }

  redactMetadata(metadata: Record<string, unknown>, summary: Record<string, number>) { return metadata; }
  redactIdentifiers(snapshot: ConversationSnapshot, summary: Record<string, number>) { return snapshot; }
}

export class MetadataPlugin implements RedactorPlugin {
  name = 'MetadataPlugin';
  private readonly SENSITIVE_KEYS = ['token', 'jwt', 'authorization', 'password', 'secret', 'email', 'phone', 'key'];

  redactText(text: string, summary: Record<string, number>) { return text; }
  redactEntities(entities: ConversationSnapshot['state']['detectedEntities'], summary: Record<string, number>) { return entities; }
  
  redactMetadata(metadata: Record<string, unknown>, summary: Record<string, number>) {
    const redactedMeta: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata || {})) {
      const isSensitiveKey = this.SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k));
      if (isSensitiveKey) {
        summary['METADATA_KEY'] = (summary['METADATA_KEY'] || 0) + 1;
        redactedMeta[key] = '[REDACTED]';
      } else {
        redactedMeta[key] = value;
      }
    }
    return redactedMeta;
  }

  redactIdentifiers(snapshot: ConversationSnapshot, summary: Record<string, number>) { return snapshot; }
}

export class IdentifierPlugin implements RedactorPlugin {
  name = 'IdentifierPlugin';
  
  redactText(text: string, summary: Record<string, number>) { return text; }
  redactEntities(entities: ConversationSnapshot['state']['detectedEntities'], summary: Record<string, number>) { return entities; }
  redactMetadata(metadata: Record<string, unknown>, summary: Record<string, number>) { return metadata; }
  
  redactIdentifiers(snapshot: ConversationSnapshot, summary: Record<string, number>) {
    if (snapshot.state.customerId) {
      summary['CUSTOMER_ID'] = (summary['CUSTOMER_ID'] || 0) + 1;
      const hashed = createHash('sha256').update(snapshot.state.customerId).digest('hex').substring(0, 16);
      return {
        ...snapshot,
        state: {
          ...snapshot.state,
          customerId: `hash_${hashed}`
        }
      };
    }
    return snapshot;
  }
}

export class ConversationSnapshotRedactor {
  private readonly plugins: RedactorPlugin[];

  constructor() {
    // Pipeline of redaction steps
    this.plugins = [
      new IdentifierPlugin(),
      new EntityPlugin(),
      new MetadataPlugin(),
      new RegexTextPlugin() // Run last to catch leaked unstructured text in metadata values
    ];
  }

  public redact(snapshot: ConversationSnapshot): RedactionResult {
    const summary: Record<string, number> = {};
    
    // 1. Initial deep clone
    let currentSnapshot = JSON.parse(JSON.stringify(snapshot)) as ConversationSnapshot;

    for (const plugin of this.plugins) {
      // 2. Redact Identifiers
      currentSnapshot = plugin.redactIdentifiers(currentSnapshot, summary);

      // 3. Redact Entities
      currentSnapshot = {
        ...currentSnapshot,
        state: {
          ...currentSnapshot.state,
          detectedEntities: plugin.redactEntities(currentSnapshot.state.detectedEntities, summary),
        }
      };

      // 4. Redact Metadata
      currentSnapshot = {
        ...currentSnapshot,
        state: {
          ...currentSnapshot.state,
          metadata: plugin.redactMetadata(currentSnapshot.state.metadata, summary),
        }
      };
    }

    // 5. Redact Unstructured Text (Steps & Metadata string values)
    const textPlugin = this.plugins.find(p => p.name === 'RegexTextPlugin');
    if (textPlugin) {
      const redactedSteps = currentSnapshot.recentSteps.map(step => ({
        ...step,
        message: textPlugin.redactText(step.message, summary),
      }));
      
      const redactedMeta: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(currentSnapshot.state.metadata || {})) {
        if (typeof value === 'string') {
          redactedMeta[key] = textPlugin.redactText(value, summary);
        } else {
          redactedMeta[key] = value;
        }
      }

      currentSnapshot = {
        ...currentSnapshot,
        recentSteps: redactedSteps,
        state: {
          ...currentSnapshot.state,
          metadata: redactedMeta,
        }
      };
    }

    return { snapshot: currentSnapshot, summary };
  }
}
