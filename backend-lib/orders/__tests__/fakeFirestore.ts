/**
 * In-memory Firestore harness for order-command and outbox tests.
 *
 * It models the parts of the Admin SDK those paths depend on — document refs,
 * equality and range queries with ordering and limits, merge writes, deletes,
 * serialized transactions and batches — so tests assert on committed state and
 * real transaction semantics instead of on hand-written mock call shapes.
 */

export interface FakeDocRef {
  collectionName: string;
  id: string;
  path: string;
  set(data: Record<string, unknown>, options?: { merge?: boolean }): Promise<void>;
  update(data: Record<string, unknown>): Promise<void>;
  get(): Promise<FakeSnapshot>;
  delete(): Promise<void>;
}

export interface FakeSnapshot {
  exists: boolean;
  id: string;
  ref: FakeDocRef;
  data: () => Record<string, unknown> | undefined;
  /** Field read, mirroring DocumentSnapshot.get. Returns undefined when absent. */
  get(field: string): unknown;
}

type Store = Map<string, Record<string, unknown>>;

/**
 * Evaluate one Firestore filter operator against a stored field.
 *
 * Numeric and string comparisons are both supported because the paths that query
 * on a timestamp (`resetAt <= now`) and on an enum (`status == 'x'`) are equally
 * part of the behaviour under test. An unknown operator throws rather than
 * silently matching nothing, so an unsupported filter cannot masquerade as a
 * test that passed.
 */
const matchesFilter = (stored: unknown, op: string, expected: unknown): boolean => {
  switch (op) {
    case '==':
      return stored === expected;
    case '!=':
      return stored !== expected;
    case '<':
    case '<=':
    case '>':
    case '>=':
      break;
    default:
      throw new Error(`fakeFirestore does not support the "${op}" filter operator`);
  }

  const left = stored as number | string | undefined;
  const right = expected as number | string;
  if (typeof left !== 'number' || typeof right !== 'number') {
    throw new Error(
      `fakeFirestore range filters need numbers, got ${typeof left} and ${typeof right}`
    );
  }
  if (op === '<') return left < right;
  if (op === '<=') return left <= right;
  if (op === '>') return left > right;
  return left >= right;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const key = (ref: { collectionName: string; id: string }): string => `${ref.collectionName}/${ref.id}`;

export interface FakeFirestoreOptions {
  /** Initial documents keyed as `collection/id`. */
  seed?: Record<string, Record<string, unknown>>;
}

export interface FakeQuery {
  where(field: string, op: string, value: unknown): FakeQuery;
  orderBy(field: string, direction?: string): FakeQuery;
  limit(count: number): FakeQuery;
  startAfter(docId: string): FakeQuery;
  get(): Promise<{ empty: boolean; size: number; docs: FakeSnapshot[] }>;
}

export interface FakeDocRef {
  collectionName: string;
  id: string;
  path: string;
  set(data: Record<string, unknown>, options?: { merge?: boolean }): Promise<void>;
  update(data: Record<string, unknown>): Promise<void>;
  get(): Promise<FakeSnapshot>;
  delete(): Promise<void>;
}

export interface FakeBatch {
  set(ref: FakeDocRef, data: Record<string, unknown>, options?: { merge?: boolean }): void;
  update(ref: FakeDocRef, data: Record<string, unknown>): void;
  delete(ref: FakeDocRef): void;
  commit(): Promise<void>;
}

export interface FakeTransaction extends FakeBatch {
  get(ref: FakeDocRef): Promise<FakeSnapshot>;
  getAll(...refs: FakeDocRef[]): Promise<FakeSnapshot[]>;
}

export interface FakeFirestore {
  collection(name: string): FakeQuery & { doc(id: string): FakeDocRef };
  /**
   * Run a transaction, serialized against every other transaction on this handle.
   *
   * Firestore serializes transactions that touch the same document and retries
   * the loser on conflict. Serializing all of them is stricter, and is what makes
   * a concurrent read-modify-write test meaningful: without it two callers could
   * both read a count and both write the same incremented value, which is a race
   * the real database cannot produce but a broken limiter can be shipped into.
   */
  runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T>): Promise<T>;
  batch(): FakeBatch;
  /**
   * Counters whose committed read throws `transientError`.
   *
   * Set for a collection to model an unreachable store, so a limiter's
   * availability behaviour can be asserted rather than assumed.
   */
  unreachableCollections: Set<string>;

  /** Make every read and write on these collections reject. */
  setUnreachableCollections(collections: string[]): void;

  /** Committed document contents, keyed `collection/id`. */
  read(collection: string, id: string): Record<string, unknown> | undefined;
  readAll(collection: string): Record<string, Record<string, unknown>>;
  /**
   * Direct write, bypassing a transaction. For staging a state a real actor
   * would have produced earlier — an elapsed backoff window, a receipt lost to a
   * partial write, an acknowledgement the server already made.
   */
  writeDoc(collection: string, id: string, data: Record<string, unknown>): void;
  deleteDoc(collection: string, id: string): void;
  /** Writes attempted by the most recent transaction, committed or not. */
  lastAttemptedWrites(): Map<string, Record<string, unknown>>;
}

export const createFakeFirestore = (options: FakeFirestoreOptions = {}): FakeFirestore => {
  const committed: Store = new Map();
  let attempted: Map<string, Record<string, unknown>> = new Map();
  /**
   * Tail of the transaction chain. Every `runTransaction` call appends to it so
   * transactions never interleave, which is what makes a concurrent
   * read-modify-write test meaningful.
   */
  let txTail: Promise<void> = Promise.resolve();

  const unreachable = new Set<string>();
  const guardReachable = (collectionName: string): void => {
    if (unreachable.has(collectionName)) {
      const error = new Error(`Firestore unavailable for ${collectionName}`) as Error & {
        code: string;
      };
      error.code = 'unavailable';
      throw error;
    }
  };

  for (const [path, data] of Object.entries(options.seed ?? {})) {
    committed.set(path, clone(data));
  }

  const docRef = (collectionName: string, id: string): FakeDocRef => ({
    collectionName,
    id,
    path: `${collectionName}/${id}`,
    async set(data, setOptions) {
      guardReachable(collectionName);
      const existing = committed.get(`${collectionName}/${id}`);
      const next =
        setOptions?.merge && existing ? { ...clone(existing), ...clone(data) } : clone(data);
      committed.set(`${collectionName}/${id}`, next);
    },
    async update(data) {
      guardReachable(collectionName);
      const existing = committed.get(`${collectionName}/${id}`);
      if (!existing) throw new Error(`Cannot update missing document ${collectionName}/${id}`);
      committed.set(`${collectionName}/${id}`, { ...clone(existing), ...clone(data) });
    },
    async get() {
      guardReachable(collectionName);
      const data = committed.get(`${collectionName}/${id}`);
      const snapshotData = data ? clone(data) : {};
      return {
        exists: data !== undefined,
        id,
        ref: docRef(collectionName, id),
        data: () => (data ? clone(data) : undefined),
        get: (field: string) => snapshotData[field],
      };
    },
    async delete() {
      guardReachable(collectionName);
      committed.delete(`${collectionName}/${id}`);
    },
  });

  const makeQuery = (
    collectionName: string,
    filters: Array<{ field: string; op: string; value: unknown }> = [],
    order: { field: string; direction: string } | null = null,
    limitCount: number | null = null,
    afterId: string | null = null
  ): FakeQuery => {
    const build = (
      nextFilters: Array<{ field: string; op: string; value: unknown }>,
      nextOrder: { field: string; direction: string } | null,
      nextLimit: number | null,
      nextAfter: string | null
    ): FakeQuery => {
      const query: FakeQuery = {
        where: (field, op, value) => build([...nextFilters, { field, op, value }], nextOrder, nextLimit, nextAfter),
        orderBy: (field, direction = 'asc') => build(nextFilters, { field, direction }, nextLimit, nextAfter),
        limit: (count: number) => build(nextFilters, nextOrder, count, nextAfter),
        startAfter: (docId: string) => build(nextFilters, nextOrder, nextLimit, docId),
        async get() {
          const prefix = `${collectionName}/`;
          let rows: Array<{ id: string; data: Record<string, unknown> }> = [];
          for (const [path, data] of committed) {
            if (!path.startsWith(prefix)) continue;
            const id = path.slice(prefix.length);
            let keep = true;
            for (const filter of nextFilters) {
              if (!matchesFilter(data[filter.field], filter.op, filter.value)) {
                keep = false;
                break;
              }
            }
            if (keep) rows.push({ id, data: clone(data) });
          }

          if (nextOrder) {
            const { field, direction } = nextOrder;
            rows.sort((a, b) => {
              const left = a.data[field];
              const right = b.data[field];
              const leftKey = typeof left === 'string' ? left : JSON.stringify(left ?? null);
              const rightKey = typeof right === 'string' ? right : JSON.stringify(right ?? null);
              return direction === 'desc'
                ? rightKey.localeCompare(leftKey)
                : leftKey.localeCompare(rightKey);
            });
          } else {
            rows.sort((a, b) => a.id.localeCompare(b.id));
          }

          if (nextAfter) {
            const index = rows.findIndex((row) => row.id === nextAfter);
            rows = index >= 0 ? rows.slice(index + 1) : rows;
          }
          if (nextLimit !== null) rows = rows.slice(0, nextLimit);

          const docs = rows.map((row) => ({
            exists: true,
            id: row.id,
            ref: docRef(collectionName, row.id),
            data: () => clone(row.data),
            get: (field: string) => clone(row.data)[field],
          }));
          return { empty: docs.length === 0, size: docs.length, docs };
        },
      };
      return query;
    };

    return build(filters, order, limitCount, afterId);
  };

  const db: FakeFirestore = {
    collection(name: string) {
      return Object.assign(makeQuery(name), { doc: (id: string) => docRef(name, id) });
    },

    unreachableCollections: unreachable,

    setUnreachableCollections(collections: string[]) {
      unreachable.clear();
      for (const collection of collections) unreachable.add(collection);
    },

    /**
     * Serialized against every other transaction on this handle, so a
     * read-modify-write behaves the way it does on Firestore: the second caller
     * to arrive observes the first one's committed write rather than the value it
     * started from.
     */
    runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T>): Promise<T> {
      const run = async (): Promise<T> => {
        // A transaction reads a snapshot and stages writes; a throw leaves the
        // committed store untouched, which is what makes atomicity testable.
        const staged: Map<string, Record<string, unknown>> = new Map();
        const removed = new Set<string>();

        const stage = (ref: FakeDocRef, data: Record<string, unknown>, merge?: boolean) => {
          const current = staged.get(key(ref)) ?? committed.get(key(ref));
          const next = merge && current ? { ...clone(current), ...clone(data) } : clone(data);
          staged.set(key(ref), next);
          removed.delete(key(ref));
        };

        const tx: FakeTransaction = {
          async get(ref: FakeDocRef): Promise<FakeSnapshot> {
            guardReachable(ref.collectionName);
            if (removed.has(key(ref))) {
              return { exists: false, id: ref.id, ref, get: () => undefined, data: () => undefined };
            }
            const data = staged.get(key(ref)) ?? committed.get(key(ref));
            return {
              exists: data !== undefined,
              id: ref.id,
              ref,
              get: (field: string) =>
                data ? (clone(data) as Record<string, unknown>)[field] : undefined,
              data: () => (data ? clone(data) : undefined),
            };
          },
          /**
           * Read several documents in one round trip, mirroring the real Admin
           * SDK signature. Callers must read through `getAll` rather than issuing
           * one `get` per reference: Firestore requires all reads to precede all
           * writes, and mixing the two fails the transaction.
           */
          async getAll(...refs: FakeDocRef[]): Promise<FakeSnapshot[]> {
            return Promise.all(refs.map((ref) => tx.get(ref)));
          },
          set(ref, data, setOptions) {
            guardReachable(ref.collectionName);
            stage(ref, data, setOptions?.merge);
          },
          update(ref, data) {
            guardReachable(ref.collectionName);
            const current = staged.get(key(ref)) ?? committed.get(key(ref));
            if (!current) throw new Error(`Cannot update missing document ${key(ref)}`);
            stage(ref, { ...clone(current), ...clone(data) });
          },
          delete(ref) {
            staged.delete(key(ref));
            removed.add(key(ref));
          },
          async commit() {
            for (const [path, data] of staged) committed.set(path, data);
            for (const path of removed) committed.delete(path);
          },
        };

        const result = await fn(tx);
        attempted = new Map(staged);
        for (const [path, data] of staged) committed.set(path, data);
        for (const path of removed) committed.delete(path);
        return result;
      };

      // Chain onto the tail so transactions execute one at a time, in call order.
      const next = txTail.then(run, run);
      txTail = next.then(
        () => undefined,
        () => undefined
      );
      return next;
    },

    batch(): FakeBatch {
      const staged: Map<string, Record<string, unknown>> = new Map();
      const removed = new Set<string>();
      return {
        set(ref, data, setOptions) {
          const current = staged.get(key(ref)) ?? committed.get(key(ref));
          const next = setOptions?.merge && current ? { ...clone(current), ...clone(data) } : clone(data);
          staged.set(key(ref), next);
          removed.delete(key(ref));
        },
        update(ref, data) {
          const current = staged.get(key(ref)) ?? committed.get(key(ref));
          if (!current) throw new Error(`Cannot update missing document ${key(ref)}`);
          staged.set(key(ref), { ...clone(current), ...clone(data) });
        },
        delete(ref) {
          staged.delete(key(ref));
          removed.add(key(ref));
        },
        async commit() {
          for (const [path, data] of staged) committed.set(path, data);
          for (const path of removed) committed.delete(path);
        },
      };
    },

    read(collection: string, id: string) {
      const data = committed.get(`${collection}/${id}`);
      return data ? clone(data) : undefined;
    },

    /**
     * Direct write, bypassing a transaction. Used by tests that need to stage a
     * state a real actor would have produced earlier — a backoff window that has
     * since elapsed, a receipt lost to a partial write — rather than to arrange
     * fixtures.
     */
    writeDoc(collection: string, id: string, data: Record<string, unknown>) {
      const current = committed.get(`${collection}/${id}`);
      committed.set(`${collection}/${id}`, current ? { ...clone(current), ...clone(data) } : clone(data));
    },
    deleteDoc(collection: string, id: string) {
      committed.delete(`${collection}/${id}`);
    },

    readAll(collection: string) {
      const prefix = `${collection}/`;
      const out: Record<string, Record<string, unknown>> = {};
      for (const [path, data] of committed) {
        if (path.startsWith(prefix)) out[path.slice(prefix.length)] = clone(data);
      }
      return out;
    },

    lastAttemptedWrites() {
      return new Map(attempted);
    },
  };

  return db;
};

export const SERVER_TIMESTAMP = '__SERVER_TIMESTAMP__';

export const mockFieldValue = {
  serverTimestamp: () => SERVER_TIMESTAMP,
  increment: (n: number) => ({ __increment: n }),
} as never;
