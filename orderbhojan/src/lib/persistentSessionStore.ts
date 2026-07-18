const DB_NAME = 'ob-session-cache-v1';
const STORE_NAME = 'entries';

export interface PersistentSessionRecord {
  readonly key: string;
  readonly payload: string;
  readonly fetchedAt: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

export async function readPersistentSessionRecord(
  key: string,
  maxAgeMs: number,
): Promise<PersistentSessionRecord | null> {
  const db = await openDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
      request.onsuccess = () => {
        const record = request.result as PersistentSessionRecord | undefined;
        if (!record || Date.now() - record.fetchedAt > maxAgeMs) {
          resolve(null);
          return;
        }
        resolve(record);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function writePersistentSessionRecord(record: PersistentSessionRecord): Promise<void> {
  const db = await openDb();
  if (!db) return;

  try {
    db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(record);
  } catch {
    // Ignore IDB write failures.
  }
}
