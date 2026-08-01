# Route, deep-link, and session contracts

**STATUS: PHASE 0 LOCKED — 2026-07-31**

## App identity (do not change)
- Android `applicationId` / namespace: `com.bhojanos.orderbhojan`
- iOS bundle ID: `com.bhojanos.orderbhojan`
- Capacitor `appId`: `com.bhojanos.orderbhojan`
- Custom scheme: `orderbhojan://`

## Canonical route IDs (stable across hybrid + native)

| Route ID | Path | Auth | Native flag (planned) |
|----------|------|------|------------------------|
| `home` | `/` | browse (guest OK) | `FF_NATIVE_HOME` |
| `search` | `/search` | open | `FF_NATIVE_SEARCH` |
| `restaurant` | `/restaurant/:restaurantSlug` | open | `FF_NATIVE_RESTAURANT` |
| `menu` | `/restaurant/:restaurantSlug/menu` | open | `FF_NATIVE_MENU` |
| `cart` | `/cart` | open | `FF_NATIVE_CART` |
| `checkout` | `/checkout` | RequireAuth + phone/Google gate | `FF_NATIVE_CHECKOUT` |
| `orders` | `/orders` | RequireAuth | `FF_NATIVE_ORDERS` |
| `track` | `/orders/:orderId/track` | open (+ guest phone) | `FF_NATIVE_TRACK` |
| `notifications` | `/notifications` | RequireAuth | `FF_NATIVE_NOTIFICATIONS` |
| `profile` | `/profile` | open | `FF_NATIVE_PROFILE` |
| `auth` | `/auth` | open | `FF_NATIVE_AUTH` |
| `favorites` | `/favorites` | RequireAuth | `FF_NATIVE_FAVORITES` |

## Deep-link contracts
| Input | Parsed route |
|-------|----------------|
| `orderbhojan://orders/{orderId}/track` | `track` |
| `orderbhojan://app/orders/{orderId}/track` | `track` |
| Push `data.path` | Same as in-app path |
| Future HTTPS App Links | Same path mapping (Phase 2+) |

Hybrid today: `capacitorBootstrap.routeDeepLink` → `history.replaceState` + `popstate`.  
Native target: platform router navigates to native screen if flag ON, else hand off to hybrid WebView host.

## Auth / session contracts
| Concept | Contract |
|---------|----------|
| Token | Firebase ID token → `Authorization: Bearer <token>` |
| Guest browse | No Bearer; `guestBrowsing=true` + stable `deviceId` |
| Checkout place | Signed-in, non-anonymous; verified IN phone **or** Google email |
| Guest tracking | `GET /api/marketplace/orders/{id}/guest-tracking?phone=` |
| Device ID | Persist `ob-web-<uuid>` equivalent in Keychain/EncryptedSharedPreferences |
| Firebase project | `bhojanos-prod` (same `google-services.json` / future `GoogleService-Info.plist`) |

## API compatibility (non-negotiable)
- Base: `VITE_MARKETPLACE_API_PROXY` / Render backend
- Header: `X-Marketplace-API-Version: 1.0`
- Header: `X-Correlation-Id`
- Envelope: `{ ok, value }` / `{ ok: false, error }` tolerated
- Thread `contextToken` restaurant → cart → quote → prepare → place

## Error / reporting
- Client errors: `POST /api/client-errors` (best-effort, no auth)
- Preserve `X-Correlation-Id` in logs for support
