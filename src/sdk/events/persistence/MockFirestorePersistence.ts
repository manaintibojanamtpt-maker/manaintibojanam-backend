/**
 * EventSDK — in-memory mock Firestore persistence (M6 PR-3 tests only).
 */

import type {
  FirestorePersistenceDocument,
  FirestorePersistenceFilter,
  FirestorePersistencePort,
} from './FirestorePersistencePort';

const collectionKey = (collection: string, id: string): string => `${collection}/${id}`;

const matchesFilter = (data: Record<string, unknown>, filter: FirestorePersistenceFilter): boolean => {
  const value = data[filter.field];
  switch (filter.op) {
    case '==':
      return value === filter.value;
    case '!=':
      return value !== filter.value;
    case '<':
      return typeof value === 'number' && typeof filter.value === 'number' && value < filter.value;
    case '<=':
      return typeof value === 'number' && typeof filter.value === 'number' && value <= filter.value;
    case '>':
      return typeof value === 'number' && typeof filter.value === 'number' && value > filter.value;
    case '>=':
      return typeof value === 'number' && typeof filter.value === 'number' && value >= filter.value;
    default:
      return false;
  }
};

export class MockFirestorePersistence implements FirestorePersistencePort {
  private readonly store = new Map<string, Record<string, unknown>>();

  async set(collection: string, id: string, data: Record<string, unknown>): Promise<void> {
    this.store.set(collectionKey(collection, id), { ...data });
  }

  async get(collection: string, id: string): Promise<FirestorePersistenceDocument | null> {
    const data = this.store.get(collectionKey(collection, id));
    if (!data) return null;
    return { id, data };
  }

  async update(collection: string, id: string, data: Record<string, unknown>): Promise<void> {
    const key = collectionKey(collection, id);
    const existing = this.store.get(key) ?? {};
    this.store.set(key, { ...existing, ...data });
  }

  async query(
    collection: string,
    filters: readonly FirestorePersistenceFilter[],
    limit: number
  ): Promise<FirestorePersistenceDocument[]> {
    const prefix = `${collection}/`;
    const results: FirestorePersistenceDocument[] = [];

    for (const [key, data] of this.store.entries()) {
      if (!key.startsWith(prefix)) continue;
      if (filters.every((f) => matchesFilter(data, f))) {
        results.push({ id: key.slice(prefix.length), data });
      }
      if (results.length >= limit) break;
    }

    return results;
  }

  /** Test helper */
  size(): number {
    return this.store.size;
  }

  /** Test helper */
  clear(): void {
    this.store.clear();
  }
}

export function createMockFirestorePersistence(): MockFirestorePersistence {
  return new MockFirestorePersistence();
}
