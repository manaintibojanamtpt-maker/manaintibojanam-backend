declare global {
  interface Window {
    __BH_FIREBASE_CONFIG__?: { projectId?: string };
  }
}

function resolveActiveProjectId(): string {
  if (typeof window === 'undefined') return 'unknown';
  const runtime = window.__BH_FIREBASE_CONFIG__?.projectId?.trim();
  if (runtime) return runtime;
  const fromEnv = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (fromEnv) return fromEnv;
  return 'unknown';
}

function isFirebaseIndexedDb(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes('firebase') ||
    lower.startsWith('firestore/') ||
    lower.includes('firestore')
  );
}

/** Drop Firestore persistence databases — stale IndexedDB after deploy causes INTERNAL ASSERTION FAILED. */
export async function deleteFirebaseIndexedDb(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  try {
    if (typeof indexedDB.databases !== 'function') return;

    const dbs = await indexedDB.databases();
    await Promise.all(
      dbs
        .map((db) => db.name)
        .filter((name): name is string => !!name && isFirebaseIndexedDb(name))
        .map(
          (name) =>
            new Promise<void>((resolve) => {
              const req = indexedDB.deleteDatabase(name);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            }),
        ),
    );
  } catch (err) {
    console.warn('[Firebase] IndexedDB cleanup failed:', err);
  }
}

export function resetFirestoreClientSingleton(): void {
  if (typeof window !== 'undefined') {
    delete window.__bhojanos_firestore_db__;
  }
}

const ASSERTION_RECOVERY_KEY = 'bh_firestore_assertion_recovery';

export function isFirestoreAssertionError(message: string): boolean {
  return message.includes('INTERNAL ASSERTION FAILED');
}

/**
 * One-shot recovery when Firestore client enters a broken persistence state.
 * Clears IndexedDB + SW caches, then reloads once per session.
 */
export async function recoverFromFirestoreAssertionFailure(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (sessionStorage.getItem(ASSERTION_RECOVERY_KEY) === 'done') return false;

  sessionStorage.setItem(ASSERTION_RECOVERY_KEY, 'done');

  const { SelfHealingUtils } = await import('../core/reliability/SelfHealingUtils');
  if (!SelfHealingUtils.canAttemptRecovery()) return false;

  console.warn('[Firebase] Recovering from Firestore internal assertion — clearing client caches.');
  await deleteFirebaseIndexedDb();
  resetFirestoreClientSingleton();
  await SelfHealingUtils.unregisterServiceWorkers();
  await SelfHealingUtils.purgeCaches();
  window.location.reload();
  return true;
}

/**
 * One-time clear when Firebase project changes (bhojanos2 → bhojanos-prod).
 * Prevents Firestore INTERNAL ASSERTION failures from mismatched IndexedDB persistence.
 */
export async function clearFirebaseProjectCacheIfChanged(): Promise<void> {
  if (typeof window === 'undefined') return;

  const projectId = resolveActiveProjectId();
  if (projectId === 'unknown') return;

  const storageKey = 'bh_active_firebase_project';
  const previous = localStorage.getItem(storageKey);

  if (!previous || previous === projectId) {
    localStorage.setItem(storageKey, projectId);
    return;
  }

  if (sessionStorage.getItem('bh_firebase_cache_clear_done') === projectId) {
    localStorage.setItem(storageKey, projectId);
    return;
  }

  console.warn(`[Firebase] Project changed ${previous} → ${projectId}. Clearing stale client caches.`);

  await deleteFirebaseIndexedDb();

  localStorage.setItem(storageKey, projectId);
  sessionStorage.setItem('bh_firebase_cache_clear_done', projectId);
  window.location.reload();
  await new Promise<void>(() => {
    /* reload in progress */
  });
}
