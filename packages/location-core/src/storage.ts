import {
  migrateLegacyFounderState,
  migrateLegacyObGuestState,
  migrateLegacyObSessionPersisted,
  migrateLegacyOrderBhojanState,
} from './migrate.js';
import { parseDeliveryAddressV2 } from './normalize.js';
import type { DeliveryAddressV2 } from './types.js';
import { STORAGE_KEYS } from './types.js';

export type StoragePort = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const getLocalStorage = (): StoragePort | null => {
  if (typeof globalThis.localStorage === 'undefined') {
    return null;
  }
  return globalThis.localStorage;
};

const getSessionStorage = (): StoragePort | null => {
  if (typeof globalThis.sessionStorage === 'undefined') {
    return null;
  }
  return globalThis.sessionStorage;
};

export function readDeliveryAddressV2(storage: StoragePort | null = getLocalStorage()): DeliveryAddressV2 | null {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(STORAGE_KEYS.address);
    if (!raw) {
      return hydrateFromLegacy(storage);
    }
    return parseDeliveryAddressV2(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeDeliveryAddressV2(
  address: DeliveryAddressV2,
  storage: StoragePort | null = getLocalStorage(),
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEYS.address, JSON.stringify(address));
  } catch {
    // quota / privacy mode
  }
}

export function clearDeliveryAddressV2(storage: StoragePort | null = getLocalStorage()): void {
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(STORAGE_KEYS.address);
  } catch {
    // ignore
  }
}

export function readDeliverySessionV2(storage: StoragePort | null = getSessionStorage()): DeliveryAddressV2 | null {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(STORAGE_KEYS.session);
    if (!raw) {
      return null;
    }
    return parseDeliveryAddressV2(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeDeliverySessionV2(
  address: DeliveryAddressV2,
  storage: StoragePort | null = getSessionStorage(),
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEYS.session, JSON.stringify(address));
  } catch {
    // ignore
  }
}

export function hydrateFromLegacy(storage: StoragePort): DeliveryAddressV2 | null {
  const migrations: Array<() => DeliveryAddressV2 | null> = [
    () => {
      const raw = storage.getItem(STORAGE_KEYS.legacyFounder);
      return raw ? migrateLegacyFounderState(JSON.parse(raw)) : null;
    },
    () => {
      const raw = storage.getItem(STORAGE_KEYS.legacyObSession);
      return raw ? migrateLegacyObSessionPersisted(JSON.parse(raw)) : null;
    },
    () => {
      const raw = storage.getItem(STORAGE_KEYS.legacyObGuest);
      return raw ? migrateLegacyObGuestState(JSON.parse(raw)) : null;
    },
  ];

  for (const migrate of migrations) {
    try {
      const migrated = migrate();
      if (migrated) {
        writeDeliveryAddressV2(migrated, storage);
        return migrated;
      }
    } catch {
      // try next legacy key
    }
  }

  return null;
}

export function migrateActiveLocationFromObState(activeLocation: unknown): DeliveryAddressV2 | null {
  return migrateLegacyOrderBhojanState(activeLocation);
}
