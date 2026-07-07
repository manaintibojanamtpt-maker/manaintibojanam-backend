# OrderBhojan — Customer Firestore Schema v1.0

**Firebase Project:** `orderbhojan`  
**Scope:** Customer-side data ONLY  
**Rule:** No restaurant catalog, menu, pricing, orders master, or tenant documents

---

## Design Principles

1. **User-scoped writes** — customers read/write only their subtree
2. **No cross-user reads** — rules enforce `request.auth.uid == uid`
3. **Minimal PII** — phone stored; encrypt at rest via Firebase default
4. **BhojanOS remains SSOT** for orders — OrderBhojan may cache order IDs in UI state only, not duplicate order documents

---

## Collections

### `customers/{uid}`

Root customer profile document.

```typescript
interface CustomerDocument {
  uid: string;
  displayName?: string;
  phone?: string;           // E.164
  email?: string;
  photoUrl?: string;
  authProviders: ('google' | 'phone' | 'anonymous')[];
  preferences: {
    vegOnlyDefault?: boolean;
    language?: 'en' | 'hi' | 'te';
    marketingOptIn?: boolean;
    notificationOrderUpdates?: boolean;
    notificationOffers?: boolean;
  };
  lastKnownLocation?: {
    lat: number;
    lng: number;
    geohash?: string;
    label?: string;
    updatedAt: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: 1;
}
```

---

### `customers/{uid}/addresses/{addressId}`

Saved delivery addresses (customer-owned; synced to checkout selection).

```typescript
interface CustomerAddressDocument {
  id: string;
  label: string;              // Home, Work, Other
  formattedAddress: string;
  houseNumber?: string;
  buildingName?: string;
  landmark?: string;
  city?: string;
  pincode?: string;
  geo: {
    lat: number;
    lng: number;
    geohash?: string;
    accuracyM?: number;
  };
  indiaStructured?: {         // optional parity with BhojanOS M2
    stateCode?: string;
    districtCode?: string;
    localityCode?: string;
  };
  isDefault: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Constraint:** Max 10 addresses per customer (enforced in rules + app).

---

### `customers/{uid}/favorites/{restaurantId}`

Favorite restaurants (key = public `restaurantId` per ADR-OB-002 — **never** BhojanOS `tenantId`).

```typescript
interface FavoriteDocument {
  restaurantId: string;       // opaque public ID
  restaurantSlug: string;     // display/cache only
  displayName: string;
  logoUrl?: string;
  addedAt: Timestamp;
}
```

**Note:** Snapshot fields for display; refresh from API on favorites page load.

---

### `customers/{uid}/recentSearches/{searchId}`

Recent search queries (cap enforced in app: 20, FIFO eviction).

```typescript
interface RecentSearchDocument {
  query: string;
  normalizedQuery: string;
  searchedAt: Timestamp;
}
```

---

### `customers/{uid}/deviceTokens/{tokenId}`

FCM device registration for push notifications.

```typescript
interface DeviceTokenDocument {
  token: string;
  platform: 'web' | 'ios' | 'android';
  appVersion: string;
  lastSeenAt: Timestamp;
  createdAt: Timestamp;
}
```

---

### `customers/{uid}/notificationInbox/{notificationId}` (optional M11)

In-app notification history.

```typescript
interface NotificationInboxDocument {
  type: 'order_update' | 'offer' | 'system';
  title: string;
  body: string;
  orderId?: string;
  tenantId?: string;
  read: boolean;
  createdAt: Timestamp;
}
```

---

## Security Rules (sketch)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    match /customers/{uid} {
      allow read, write: if isOwner(uid);

      match /addresses/{addressId} {
        allow read, write: if isOwner(uid);
      }
      match /favorites/{restaurantId} {
        allow read, write: if isOwner(uid);
      }
      match /recentSearches/{searchId} {
        allow read, write: if isOwner(uid);
      }
      match /deviceTokens/{tokenId} {
        allow read, write: if isOwner(uid);
      }
      match /notificationInbox/{notificationId} {
        allow read, update: if isOwner(uid);
        allow create: if false; // server-only via Cloud Function
      }
    }
  }
}
```

---

## Explicitly Forbidden Collections

| Collection | Reason |
|------------|--------|
| `tenants` | BhojanOS SSOT |
| `branches` | BhojanOS SSOT |
| `menu` / `menuItems` | BhojanOS SSOT |
| `orders` (master) | BhojanOS SSOT |
| `adminSettings` | Platform config |
| `geoIndex` | Discovery index |

---

## Index Requirements

| Collection | Fields | Purpose |
|------------|--------|---------|
| `customers/{uid}/addresses` | `isDefault ASC` | Default address lookup |
| `customers/{uid}/favorites` | `addedAt DESC` | Recent favorites |
| `customers/{uid}/recentSearches` | `searchedAt DESC` | Recent searches |

---

## Sync with BhojanOS

| Data | OrderBhojan FS | BhojanOS |
|------|----------------|----------|
| Customer profile | Primary for OB app | `users/{uid}` on order linkage |
| Addresses | Primary for OB UX | Passed at checkout only |
| Orders | **Not stored** | `orders/{id}` SSOT |
| Favorites | Primary | Not required |

On authenticated checkout, address + profile forwarded to BhojanOS order payload — no bidirectional sync required for MVP.

---

**Status:** Draft for ARB review · Rules deployed in M1/M12 gates
