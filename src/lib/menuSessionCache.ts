import type { MenuItem } from '../types';

const STORAGE_KEY = 'bds-menu-session-v1';
const IDB_NAME = 'bds-menu-session-v1';
const IDB_STORE = 'snapshots';
const IDB_PREFIX = 'menu:';
const SESSION_TTL_MS = 30 * 60_000;
const MAX_ENTRIES = 6;

export interface MenuSessionSnapshot {
  readonly tenantId: string;
  readonly menu: MenuItem[];
  readonly categories: readonly Record<string, unknown>[];
  readonly settings: Record<string, unknown> | null;
  readonly fetchedAt: number;
}

interface MenuSessionEntry extends MenuSessionSnapshot {}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

function menuCacheKey(tenantId: string): string {
  return `${IDB_PREFIX}${tenantId}`;
}

function readAllEntries(): MenuSessionEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MenuSessionEntry[];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((entry) => now - entry.fetchedAt <= SESSION_TTL_MS);
  } catch {
    return [];
  }
}

function writeAllEntries(entries: MenuSessionEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Quota or private mode — ignore.
  }
}

function upsertLocalEntry(entry: MenuSessionEntry): void {
  const rest = readAllEntries().filter((existing) => existing.tenantId !== entry.tenantId);
  writeAllEntries([entry, ...rest]);
}

export function readMenuSessionCache(tenantId: string): MenuSessionSnapshot | undefined {
  return readAllEntries().find((entry) => entry.tenantId === tenantId);
}

export function getMenuSessionCacheUpdatedAt(tenantId: string): number | undefined {
  return readAllEntries().find((entry) => entry.tenantId === tenantId)?.fetchedAt;
}

export function writeMenuSessionCache(snapshot: MenuSessionSnapshot): void {
  const entry: MenuSessionEntry = { ...snapshot, fetchedAt: snapshot.fetchedAt || Date.now() };
  upsertLocalEntry(entry);

  void openDb().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({
        key: menuCacheKey(snapshot.tenantId),
        payload: JSON.stringify(entry),
        fetchedAt: entry.fetchedAt,
      });
    } catch {
      // Ignore IDB write failures.
    }
  });
}

export async function hydrateMenuSessionCacheFromIdb(tenantId: string): Promise<MenuSessionSnapshot | undefined> {
  const local = readMenuSessionCache(tenantId);
  if (local) return local;

  const db = await openDb();
  if (!db) return undefined;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const request = tx.objectStore(IDB_STORE).get(menuCacheKey(tenantId));
      request.onsuccess = () => {
        const record = request.result as { payload?: string; fetchedAt?: number } | undefined;
        if (!record?.payload || typeof record.fetchedAt !== 'number') {
          resolve(undefined);
          return;
        }
        if (Date.now() - record.fetchedAt > SESSION_TTL_MS) {
          resolve(undefined);
          return;
        }

        try {
          const parsed = JSON.parse(record.payload) as MenuSessionSnapshot;
          if (parsed?.tenantId !== tenantId || !Array.isArray(parsed.menu)) {
            resolve(undefined);
            return;
          }
          upsertLocalEntry({ ...parsed, fetchedAt: record.fetchedAt });
          resolve(parsed);
        } catch {
          resolve(undefined);
        }
      };
      request.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export function clearMenuSessionCacheForTests(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
