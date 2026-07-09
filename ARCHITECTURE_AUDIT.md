# Architecture Audit — BhojanOS / OrderBhojan Monorepo

**Audit date:** 2026-07-09  
**Scope:** `f:/Manaintibojanam_final2` (read-only; no code changes)  
**Auditor role:** Senior software architect — trace, document, do not modify

---

## Executive Summary

This repository is a **full-stack monorepo** for a multi-tenant restaurant SaaS platform (**BhojanOS**) plus a separate marketplace customer app (**OrderBhojan**). Production traffic today follows:

| Layer | Platform | Artifact |
|-------|----------|----------|
| BhojanOS SPA + marketing | Vercel (`vercel.json`) | `dist/` from `npm run build:web` |
| Founder storefront | Firebase Hosting (`mana-inti-bojanam-pune-492610`) | Same `dist/` with hosting target |
| OrderBhojan customer app | Firebase Hosting (`orderbhojan.web.app`) | `orderbhojan/dist/` |
| Unified API | Render (`render.yaml`) | `dist/server.cjs` from `server.ts` |
| Data plane | Firebase (`bhojanos-prod`, `orderbhojan`, legacy `bhojanos2`) | Firestore, Auth, Storage, FCM |

The codebase is mid-migration: **legacy client-side Firestore access** coexists with **server-side marketplace APIs** and an extensive **SDK/projection layer** (mostly feature-flagged OFF in production per GA-1 gates). Several security controls exist but are **not enforced by default** (`FF_ORDER_AUTH_ENFORCE`, public checkout without token binding). **Hardcoded credentials and API keys** were found in committed files.

---

## 1. HIGH-LEVEL ARCHITECTURE

### 1.1 What This App Is

**Both frontend and backend**, organized as a monorepo with two customer-facing SPAs and one Express API.

| Component | Type | Entry point | Router / bootstrap |
|-----------|------|-------------|-------------------|
| **BhojanOS** (owner portal, storefront, admin, marketing) | React 18 + Vite SPA | `index.html` → `src/main.tsx` | Conditional bootstrap: marketing (`MarketingApp`), owner auth (`ownerAuthBootstrap`), default (`appBootstrap` → `App.tsx`) — `src/main.tsx:41-65` |
| **OrderBhojan** (marketplace customer PWA) | React 18 + Vite SPA | `orderbhojan/index.html` → `orderbhojan/src/main.tsx` | `App.tsx` → `AppProviders` + `AppRouter` — `orderbhojan/src/app/App.tsx:6-14` |
| **Production API** | Express (Node 20+) | `server.ts` (bundled to `dist/server.cjs`) | Listens `0.0.0.0:PORT` — `server.ts:326`, `server.ts:5048+` |
| **Legacy mini-server** | Express | `server/server.js` | WebAuthn + Razorpay stub; superseded by `server.ts` — `server/package.json:7` |
| **Firebase Functions** | Node 24 | `functions/index.js` | **No active exports**; Razorpay migrated to Render — `functions/index.js:12-15` |
| **Capacitor mobile** | Native wrappers | `capacitor.config.ts` | Wraps BhojanOS web build |

**Vite multi-page** for BhojanOS: `main` + `marketing` entries — `vite.config.ts:84-87`.

### 1.2 Folder / Layer Structure

```
f:/Manaintibojanam_final2/
├── src/                    # BhojanOS React app (pages, components, context, services, sdk/)
├── server.ts               # Primary Express API (~5,800 lines)
├── backend-lib/            # Shared server modules (marketplace, observability, firebase admin)
├── orderbhojan/            # Standalone marketplace customer app (synced to separate GitHub repo)
├── packages/
│   ├── design-system/      # @bhojan/design-system (BDS CSS + components)
│   └── marketplace-contracts/  # Frozen Marketplace API v1.0 DTOs
├── functions/              # Firebase Cloud Functions (stub)
├── server/                 # Legacy Express server
├── public/                 # Static assets, PWA SW
├── scripts/                # Gates, E2E, security tests, sync tooling
├── terraform/, helm/, k8s/ # Staging GCP/GKE IaC (not current prod path)
├── docs/                   # Milestones, ADRs, program status
└── .github/workflows/      # CI (GA gates, OrderBhojan CI, IaC)
```

**Architectural layers (BhojanOS):**

| Layer | Location | Responsibility |
|-------|----------|----------------|
| UI / pages | `src/pages/`, `src/components/` | Storefront, owner portal, admin, marketing |
| Context / state | `src/context/` | `AuthContext`, `TenantContext`, `CartProvider` |
| Services (legacy Firestore) | `src/services/api.ts`, `src/services/*.ts` | Direct Firestore CRUD for orders, menu, users |
| SDK (strangler) | `src/sdk/*` | Discovery, search, menu, pricing, events projections — feature-flagged |
| Config | `src/config/` | Environment, Firebase client, feature flags |
| Owner API clients | `src/lib/owner*.ts` | HTTP to `/api/owner/*` with Bearer token |

**OrderBhojan layers:**

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Features | `orderbhojan/src/features/*` | Discovery, cart, checkout, tracking, auth |
| Marketplace API client | `orderbhojan/src/marketplace-api/` | HTTP to Render `/api/marketplace/*` |
| Limited Firestore | `orderbhojan/src/features/auth/infrastructure/customerRepository.ts`, `orderbhojan/src/features/location/infrastructure/firestoreAddressRepo.ts` | `customers/{uid}` profiles and addresses only |
| MSW mocks | `orderbhojan/src/marketplace-api/mocks/` | Dev/test when `VITE_MSW_ENABLED=true` |

### 1.3 External Services

| Service | Purpose | Integration files |
|---------|---------|-------------------|
| **Firebase** (Auth, Firestore, Storage, FCM, Hosting, Analytics) | Primary data + auth + push + static hosting | `server.ts:9-12`, `src/config/firebaseClientConfig.ts`, `backend-lib/firebase/FirebaseAdminProvider.ts`, `orderbhojan/src/firebase/` |
| **Render** | Production API hosting | `render.yaml:1-17`, `vercel.json:52-55` (proxy target) |
| **Vercel** | BhojanOS SPA + marketing | `vercel.json:1-70` |
| **Firebase Hosting** | Storefront, SaaS target, OrderBhojan | `firebase.json`, `orderbhojan/firebase.json`, `.firebaserc:2-7` |
| **Razorpay** | Online payments (production) | `server.ts:499-517`, `server.ts:3446+`, `src/lib/payments/providers/RazorpayProvider.ts`, `orderbhojan/.env.example:25` |
| **Resend** | Transactional email (preferred on Render) | `server.ts:1691-1731` |
| **SMTP / Nodemailer** (Gmail) | Email fallback | `server.ts:1606-1688`, `.env.example:43-46` |
| **Meta WhatsApp Graph API** | Order notifications | `server.ts:1937-1989` (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`) |
| **Ollama** (optional) | Local LLM fallback for AI chat | `aiProvider.ts:129-136` |
| **OpenStreetMap Nominatim** | Geocoding | `src/sdk/location/providers/open-geocoding/nominatim/` |
| **Google reCAPTCHA** | Owner registration, phone OTP | `src/pages/owner/OwnerRegister.tsx:35`, `orderbhojan/src/features/auth/infrastructure/firebaseAuth.ts:87` |
| **FingerprintJS** | Device fingerprint on owner register | `src/pages/owner/OwnerRegister.tsx:36` |
| **WebAuthn / SimpleWebAuthn** | Passkeys / biometric | `server.ts:14-19`, `server.ts:4326+`, `src/services/biometric.service.ts` |
| **Porter / Rapido** | Courier adapters (**stubs only**) | `src/services/courierAdapters.ts:45-220` |
| **GCP / GKE / Terraform** | Staging spine (future) | `terraform/`, `helm/`, `.github/workflows/iac-*.yml` |
| **Stripe, PhonePe, Cashfree, PayPal** | Payment stubs | `src/lib/payments/PaymentFactory.ts:15-19` — throw "Not yet implemented" |
| **socket.io** | Declared in deps | `package.json` — **no imports found in TS/JS source** |
| **Mixkit** | Order alert sound | `src/pages/AdminPanel.tsx:143` |

**Firebase projects** (`.firebaserc:2-7`):

| Alias | Project ID | Use |
|-------|------------|-----|
| `default` | `bhojanos2` | Dev / legacy |
| `bhojanos-prod` / `bhojanos` | `bhojanos-prod` | Production data |
| `orderbhojan` | `orderbhojan` | OrderBhojan hosting (separate Firebase project) |

### 1.4 Environment Variables

Variables are read from `process.env` (server), `import.meta.env` / `VITE_*` (client), and deploy configs (`render.yaml`, `.env.example`). No committed `.env` files were found; only `.env.example` templates.

#### 1.4.1 Server runtime (`process.env`) — selected catalog

| Variable | Read at | Purpose | Fallback if missing |
|----------|---------|---------|---------------------|
| `NODE_ENV` | `server.ts:529` | Prod vs dev rate limits, error detail | Implicit `development` locally |
| `PORT` | `server.ts:326` | HTTP listen port | `8080` |
| `PLATFORM_TIER` | `server.ts:355,383-385` | `free` vs `standard` (crons, workers) | prod → `free`, dev → `standard` |
| `FIREBASE_PROJECT_ID` | `FirebaseAdminProvider.ts:50`, `server.ts:332,394` | Admin SDK project | Chain: `GOOGLE_CLOUD_PROJECT` → `GCP_PROJECT` |
| `GOOGLE_CLOUD_PROJECT` / `GCP_PROJECT` | `FirebaseAdminProvider.ts:51-52` | GCP project alias | Same chain |
| `FIREBASE_STORAGE_BUCKET` | `FirebaseAdminProvider.ts:66`, `kycStorage.ts:13` | Storage bucket | `{projectId}.firebasestorage.app` |
| `FIRESTORE_DATABASE_ID` | `FirebaseAdminProvider.ts:72` | Named Firestore DB | `'(default)'` |
| `FIREBASE_SERVICE_ACCOUNT` | `FirebaseAdminProvider.ts:136` | Inline SA JSON | ADC / `GOOGLE_APPLICATION_CREDENTIALS` |
| `GOOGLE_APPLICATION_CREDENTIALS` | `FirebaseAdminProvider.ts:137` | Path to SA file | `null` → ADC |
| `FIREBASE_WEB_API_KEY` | `server.ts:401-403` | `/api/client-config` bootstrap | Also reads `VITE_FIREBASE_API_KEY`, `FIREBASE_API_KEY` |
| `FIREBASE_WEB_APP_ID` | `server.ts:406-407` | Web app id for client-config | Also `VITE_FIREBASE_APP_ID` |
| `FIREBASE_WEB_MESSAGING_SENDER_ID` | `server.ts:410-411` | FCM sender id | Also `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `FIREBASE_AUTH_DOMAIN` | `server.ts:417` | Auth domain | `{projectId}.firebaseapp.com` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | `server.ts:336,501-502` | Payments | Empty → payments disabled |
| `EMAIL_USER` / `SMTP_USER` | `server.ts:342,1227,1626` | SMTP auth | — |
| `EMAIL_PASS` / `SMTP_PASS` | `server.ts:342,1228,1632` | SMTP password | Placeholder `your_app_password` → email disabled |
| `EMAIL_FROM` | `server.ts:1627` | From header | Falls back to `EMAIL_USER` |
| `EMAIL_HOST` / `EMAIL_PORT` | `server.ts:1648-1668` | SMTP server | `smtp.gmail.com` / `587` |
| `RESEND_API_KEY` | `server.ts:1653,1697` | Resend API | Missing → SMTP only |
| `RESEND_FROM` | `server.ts:1704` | Resend from header | `"${fromLabel}" <${fromEmail}>` |
| `FOUNDER_EMAIL` | `server.ts:351,642,1238,1623,2699` | Superadmin / notifications | `manaintibojanamtpt@gmail.com` |
| `FOUNDER_NAME` | `server.ts:1781` | Email signature | `"The BhojanOS Team"` |
| `FOUNDER_TENANT_ID` | `server.ts:2694` | Founder tenant slug | `"mana-inti"` |
| `CRON_SECRET` | `server.ts:359,4744,5518+` | Bearer for cron routes | Missing in prod → logged warning; behavior varies by route |
| `BIOMETRIC_SALT` | `server.ts:363,4506,4542` | Biometric HMAC | **`'mana-inti-salt'`** (weak default) |
| `ORDER_GUEST_TOKEN_SECRET` | `guestOrderToken.ts:37-44` | Guest order JWT HMAC | **Required ≥32 chars; throws if missing** |
| `RECAPTCHA_SECRET_KEY` | `server.ts:2644` | Owner registration bot check | Missing → registration proceeds without CAPTCHA |
| `WHATSAPP_ACCESS_TOKEN` | `server.ts:1938` | WhatsApp API | Missing → mock log |
| `WHATSAPP_PHONE_NUMBER_ID` | `server.ts:1939` | WhatsApp sender | Missing → mock |
| `WHATSAPP_API_VERSION` | `server.ts:1940` | Graph API version | `"v20.0"` |
| `PUBLIC_APP_URL` | `customerOrderLinks.ts:32` | Public BhojanOS URL | `https://www.bhojanos.com` |
| `ORDERBHOJAN_URL` | `customerOrderLinks.ts:16` | OrderBhojan base URL | Also `VITE_ORDERBHOJAN_URL`, `CUSTOMER_APP_URL`; default `https://orderbhojan.web.app` |
| `FOUNDER_STOREFRONT_URL` / `MANA_INTI_STOREFRONT_URL` | `customerOrderLinks.ts:27-28` | Founder storefront links | `https://mana-inti-bojanam-pune-492610.web.app` |
| `STOREFRONT_BASE_URL` | `server.ts:4791,5342+` | Sitemap/SEO | `https://bhojanos.com` |
| `PUBLIC_API_ORIGIN` | `ownerStorefrontMediaRoutes.ts:25` | Media URL origin | Request host or Render URL |
| `TENANT_CACHE_MS` | `server.ts:1092` | Tenant validation cache | `600000` (10 min) |
| `SETTINGS_CACHE_MS` | `server.ts:1531` | Settings cache | `300000` (5 min) |
| `FIRESTORE_QUOTA_BACKOFF_MS` | `server.ts:112` | Quota circuit breaker | `900000` (15 min) |
| `FIRESTORE_READ_TIMEOUT_MS` | `server.ts:395` | Firestore read timeout | `12000` |
| `WORKER_INTERVAL_MS` | `server.ts:4937` | Outbox worker interval | Tier-based 1–10 min |
| `CRON_STARTUP_DELAY_MS` | `server.ts:5382` | Cron startup delay | `120000` |
| `STOREBRAIN_REFRESH_ON_STARTUP` | `server.ts:5072` | Menu brain refresh | Only if `"true"` |
| `RENDER_GIT_COMMIT` | `server.ts:1249,5051` | Deploy SHA in health | `"local"` |
| `OLLAMA_BASE_URL` | `aiProvider.ts:135` | Ollama endpoint | `http://localhost:11434` |
| `OLLAMA_MODEL` | `aiProvider.ts:136` | Ollama model | `"llama3.2"` |
| `FF_ORDER_AUTH_ENFORCE` | `orderAccess.ts:191-194` | Enforce order read auth | **`false`** unless `true`/`1`/`yes` |
| `FF_RAZORPAY_DRAFT_BIND` | `orderAccess.ts:196-199` | Razorpay draft user binding | `false` unless truthy |
| `FF_MARKETPLACE_GEOINDEX` | `marketplaceGeoIndexPolicy.ts:3` | Geo index for discovery | **ON by default** unless `'false'` |

**Documented but unused in runtime:** `JWT_SECRET` (`.env.example:138`), `VITE_GOOGLE_MAPS_API_KEY` (`.env.example:91`), `GEMINI_API_KEY` (scratch scripts only).

#### 1.4.2 BhojanOS client (`VITE_*`) — selected catalog

| Variable | Read at | Purpose | Fallback |
|----------|---------|---------|----------|
| `VITE_APP_ENV` | `src/config/environment.ts:11,15,19` | `production`/`preview`/`development` | Vite `PROD`/`DEV` |
| `VITE_API_URL` | `src/config/environment.ts:70-71`, `vite.config.ts:31` | Backend API | `https://manaintibojanam-backend.onrender.com` |
| `VITE_ORDERBHOJAN_URL` | `src/config/environment.ts:91-95` | OrderBhojan URL | `https://orderbhojan.web.app` |
| `VITE_PLATFORM_TIER` | `src/config/platformTier.ts:9-12` | Client tier mirror | prod → `"free"` |
| `VITE_APP_BUILD_ID` | `src/lib/appBuildId.ts:2`, `vite.config.ts:36` | Build id | `'dev'` |
| `VITE_FIREBASE_*` | `src/config/firebaseClientConfig.ts:45-52` | Firebase web SDK | Runtime config or **hardcoded `DEV_FIREBASE`** — `firebaseClientConfig.ts:5-13` |
| `VITE_FIREBASE_VAPID_KEY` | `NotificationService.ts:166` | Web push | undefined → push disabled |
| `VITE_RAZORPAY_KEY_ID` | `RazorpayProvider.ts:34` | Checkout key | Prefer API response |
| `VITE_RECAPTCHA_SITE_KEY` | `OwnerRegister.tsx:52` | reCAPTCHA | `''` |
| `VITE_FF_*` | `src/config/features.ts:48`, SDK flag files | Feature flags | **OFF** unless `'true'` |

Build-time verification: `scripts/verify-vercel-firebase-env.mjs` runs before `build:web` — `package.json:20`.

#### 1.4.3 OrderBhojan client (`VITE_*`)

| Variable | Read at | Purpose | Fallback |
|----------|---------|---------|----------|
| `VITE_MARKETPLACE_API_URL` | `orderbhojan/src/config/environment.ts:43` | Direct API URL | — |
| `VITE_MARKETPLACE_API_PROXY` | `orderbhojan/src/config/environment.ts:50-52`, `vite.config.ts:59` | Dev proxy target | dev: `localhost:8080`; prod: Render |
| `VITE_MARKETPLACE_API_VERSION` | `orderbhojan/src/config/environment.ts:62` | API version header | `'1.0'` |
| `VITE_MSW_ENABLED` | `orderbhojan/src/config/environment.ts:79` | Mock Service Worker | dev `'true'`, prod `'false'` |
| `VITE_APP_CHECK_ENABLED` | `orderbhojan/src/config/environment.ts:80` | Firebase App Check | `'false'` |
| `VITE_ANALYTICS_ENABLED` | `orderbhojan/src/config/environment.ts:81` | Analytics | `'true'` |
| `VITE_API_TIMEOUT_MS` | `orderbhojan/src/config/environment.ts:84` | HTTP timeout | `30000` |
| `VITE_API_RETRY_ATTEMPTS` | `orderbhojan/src/config/environment.ts:85` | Retries | `2` |
| `VITE_API_RETRY_DELAY_MS` | `orderbhojan/src/config/environment.ts:86` | Retry delay | `500` |
| `VITE_FF_OB_*` | `orderbhojan/src/featureFlags/flags.ts:1-68` | Feature flags | Default `false`; **prod auto-enables `FF_OB_FIRESTORE` cascade** — `flags.ts:55-68` |
| `VITE_FIREBASE_*` | `orderbhojan/src/config/environment.ts:64-73` | Firebase config | `''` or bootstrap via `/api/client-config` — `orderbhojan/src/config/clientConfig.ts:58-88` |

Full templates: `.env.example` (root), `orderbhojan/.env.example`.

#### 1.4.4 Render-deployed vars (`render.yaml`)

```7:17:render.yaml
    envVars:
      - key: NODE_ENV
        value: production
      - key: ORDERBHOJAN_URL
        value: https://orderbhojan.web.app
      - key: FOUNDER_STOREFRONT_URL
        value: https://mana-inti-bojanam-pune-492610.web.app
      - key: PUBLIC_APP_URL
        value: https://www.bhojanos.com
      - key: NODE_OPTIONS
        value: --max-old-space-size=4096
```

Secrets (Razorpay, Firebase SA, email, WhatsApp, cron) are **not** in `render.yaml`; expected via Render dashboard.

---

## 2. DATA FLOW

### 2.1 Data Access Overview

| Store | Client-side (browser) | Server-side (Render / Functions) |
|-------|----------------------|----------------------------------|
| **Firestore** | BhojanOS: extensive via `src/services/api.ts`, pages, hooks | `server.ts`, `backend-lib/*`, `functions/src/notifications.ts` |
| **Firestore** | OrderBhojan: **limited** — `customers/{uid}`, addresses subcollection only | Marketplace routes read/write orders, tenants, menu, projections |
| **HTTP API** | Both apps call Render `/api/*` | N/A |
| **localStorage / sessionStorage** | Cart, restaurant context, owner active tenant | N/A |

OrderBhojan primary data path is **HTTP marketplace API**, not direct Firestore (except customer profile/addresses).

### 2.2 Firestore Security Rules Summary

File: `firestore.rules`

| Helper | Lines | Behavior |
|--------|-------|----------|
| `isTenantOwner(tenantId)` | `23-27` | Checks `tenantId in users/{uid}.ownedTenantIds` |
| `isAdmin()` | `13-18` | Custom claim or Firestore role |
| Menu read | `121-122` (approx.) | **World-readable** |
| Tenants read | `306-307` (approx.) | **World-readable** |
| `payment_verifications` | rules | **Client write denied** (server-only) |
| `discovery_profiles`, `geoIndex`, `marketplace_meta` | rules | Client **write denied** (server projections) |

**Collections with no matching rule** (implicit deny for clients): `courierDispatches`, `client_errors`, `tenant_forecasts`, `tenant_forecast_accuracy`, `case_studies`, `system_counters`, `webhook_events`, `notification_outbox`, `recipes`, `incidents`, `tenants/{id}/events`, `tenants/{id}/notifications`.

Storage rules: `storage.rules` — KYC paths scoped by tenant; menu/profile public read.

### 2.3 Firestore Access by Collection

Legend: **R** = one-time read, **L** = realtime listener (`onSnapshot`), **W** = write, **B** = batch, **T** = transaction.

#### `users/{uid}`

| Side | File:function | Op | Notes |
|------|---------------|-----|-------|
| Client | `src/context/AuthContext.tsx:59` | R | Profile refresh |
| Client | `src/lib/userProfileBootstrap.ts:20-62` | R/W | Bootstrap on login |
| Client | `src/services/userProfile.ts:20-80` | R/W | Profile CRUD |
| Client | `src/services/api.ts:235-337` | R/W | Legacy user helpers |
| Client | `src/pages/Checkout.tsx:239-665` | W | Embedded addresses, checkout |
| Client | `src/pages/Addresses.tsx:23-47` | W | Address updates |
| Client | `src/firebase.ts:51` | W | FCM token on user doc |
| Client | `src/services/NotificationService.ts:217-254` | W | `deviceTokens` |
| Client | `src/services/LoyaltyService.ts:21-30` | R/W | Loyalty points |
| Server | `server.ts:627-687` | R | Token verify + user lookup |
| Server | `server.ts:2708-2824` | R/W | Owner tenant sync |
| Server | `server.ts:3219-3336` | R/W | Owner provision |
| Server | `server.ts:2043-2096` | R/W | Push notification token read |
| Server | `server.ts:4315-4548` | R/W | WebAuthn, passkeys, biometric_devices |

#### `customers/{uid}` (OrderBhojan + marketplace API)

| Side | File:function | Op | Notes |
|------|---------------|-----|-------|
| Client | `orderbhojan/.../customerRepository.ts:42-67` | R/W | Profile upsert |
| Server | `backend-lib/marketplace/marketplaceCustomerRoutes.ts:51-157` | R/W | Favorites, notifications tokens |

#### `customers/{uid}/addresses/{id}`

| Side | File:function | Op | Notes |
|------|---------------|-----|-------|
| Client | `orderbhojan/.../firestoreAddressRepo.ts:42-91` | R/W/B | List, save, delete, set default |

#### `tenants/{tenantId}` (+ subcollections)

| Side | File:function | Op | Path / notes |
|------|---------------|-----|--------------|
| Client | `src/context/TenantContext.tsx:289-297` | R | Load by id or slug query |
| Client | `src/lib/discovery/firestoreTenantReadPort.ts:14-29` | R | Active tenants query |
| Client | `src/lib/ownerAccess.ts:52-95` | R | Owner tenant resolution |
| Client | `src/hooks/useCheckoutState.ts:84` | **L** | Checkout settings listener |
| Client | `src/services/AnalyticsService.ts:84-108` | W | `tenants/{id}/events`, `analytics/overview` |
| Client | `src/modules/notifications/NotificationRepository.ts:31-293` | R/W/B | `notifications`, `notification_analytics` |
| Server | `server.ts:1116-1118` | R | Tenant validation middleware |
| Server | `server.ts:2858-2926` | R | `assertOwnerTenantAccess` |
| Server | `backend-lib/marketplace/marketplaceTenantLoader.ts:4-19` | R | Slug → doc |
| Server | `backend-lib/marketplace/projectDiscovery.ts:266-320` | R | Discovery projection |
| Server | `backend-lib/marketplace/tenantSyncService.ts:31-120` | R/W | Sync + `marketplace_meta` |
| Server | `backend-lib/marketplace/ownerPortalRoutes.ts` | R/W | Campaigns, storefront settings |
| Server | `backend-lib/marketplace/discoveryProfileWriter.ts:26-37` | W | `discovery_profiles` |
| Server | `backend-lib/marketplace/geoIndexWriter.ts:25-65` | W/B | `geoIndex` |

#### `menu/{itemId}`

| Side | File:function | Op | Notes |
|------|---------------|-----|-------|
| Client | `src/pages/Home.tsx:161-279` | R | Home popular items |
| Client | `src/pages/Menu.tsx:285-350` | R/W | Menu display + review side-effect |
| Client | `src/pages/Checkout.tsx:126-166` | R | Cart validation |
| Client | `src/pages/AdminPanel.tsx:249-423` | R/**L**/W/D | Admin CRUD + listener |
| Client | `src/services/api.ts:173-177` | R | `fetchMenuItems` |
| Server | `server.ts:2929-3105` | R/W | `/api/owner/menu/*` |
| Server | `server.ts:3660-3682` | R | `/api/menu` public |
| Server | `backend-lib/marketplace/menuTenantQuery.ts:3-16` | R | Query by tenantId OR slug |
| Server | `backend-lib/marketplace/ownerMenuRoutes.ts:86-113` | R/W | Owner menu API |
| Server | `backend-lib/marketplace/projectCartValidation.ts:17` | R | Cart validate |
| Server | `backend-lib/marketplace/projectSearch.ts:243` | R | Search index |

#### `orders/{orderId}`

| Side | File:function | Op | Notes |
|------|---------------|-----|-------|
| Client | `src/services/api.ts:373-762` | R/W/**L** | Create, list, subscribe, expire |
| Client | `src/lib/myOrdersReads.ts:108-122` | **L** or SDK poll | Feature-flag branch |
| Client | `src/components/OrderTracking.tsx:236-389` | R/**L**/W | Tracking + feedback |
| Client | `src/components/ActiveOrderStrip.tsx:27-32` | R (poll 30s) | Active order poll |
| Client | `src/pages/AdminPanel.tsx:454-468` | W | Status updates |
| Server | `server.ts:197-292` | **T** | `promoteDraftTransaction` |
| Server | `server.ts:3725-4125` | R/W | Legacy `/api/orders` |
| Server | `backend-lib/marketplace/projectCheckout.ts:360-391` | W/B | Marketplace checkout |
| Server | `backend-lib/marketplace/projectMarketplaceOrders.ts:118-330` | R | Order list/get/tracking projection |
| Server | `backend-lib/marketplace/marketplaceRoutes.ts:642-758` | R/W | Place order, feedback |
| Server | `backend-lib/marketplace/orderNumberAllocator.ts:12` | **T** | `system_counters` + order number |
| Server | `backend-lib/marketplace/ownerOrdersRoutes.ts:50-63` | R | Owner orders API |
| Functions | `functions/src/notifications.ts:72-356` | R | Triggers read `users` on order events |

#### `order_drafts/{draftId}`

| Side | File:function | Op | Notes |
|------|---------------|-----|-------|
| Client | `src/services/api.ts:373-386` | W | `stageOrderDraft` |
| Server | `server.ts:197-292,3446-3617` | R/W/**T** | Razorpay + promotion |
| Server | `backend-lib/marketplace/projectCheckout.ts` | W | Marketplace Razorpay drafts |
| Server | `server.ts:838-889` | R/W | Expiry sweeps |

#### Other collections (representative)

| Collection | Client | Server |
|------------|--------|--------|
| `categories` | `Home.tsx`, `Menu.tsx`, `AdminPanel.tsx` R/**L**/W | `server.ts:1509-1525` seed |
| `coupons` | `Checkout.tsx`, `AdminPanel.tsx` R/**L**/W | `marketplaceRoutes`, `ownerCouponsRoutes`, `server.ts:2499` |
| `reviews` | `Menu.tsx`, `MyOrders.tsx`, `OrderTracking.tsx`, `AdminPanel.tsx` | `server.ts:2551-2625` batch |
| `banners` | `Banner.tsx` **L**, `AdminPanel.tsx` | — |
| `subscriptions` | `SubscriptionPage.tsx` **L**/W | `ownerSubscriptionRoutes` |
| `referrals` | `api.ts`, `userProfile.ts` W | `marketplaceReferralRoutes.ts:53` **T** |
| `adminSettings/global` | `useCheckoutState.ts` **L**, `AIAssistant.tsx` **L**, `AdminPanel.tsx` | `server.ts:1311,1564,3706` |
| `paymentProofs` | `PaymentVerificationService.ts` R/W | — |
| `payment_verifications` | — (denied) | `backend-lib/paymentAudit.ts:27` W |
| `notification_outbox` | — | `server.ts:1765,2198-2274` R/W |
| `discovery_profiles` | — (write denied) | `discoveryProfileWriter.ts` W |
| `geoIndex` | — (write denied) | `geoIndexWriter.ts` W/B |
| `system_counters` | — | `orderNumberAllocator.ts` **T** |
| `client_errors` | `TelemetryService.ts:116` W (**likely denied**) | `IncidentRepository.ts:106-210` R/W |
| `courierDispatches` | `CourierTrackingTimeline.tsx:54` **L** (**no rule**) | — |
| `incidents` | — | `observability/IncidentRepository.ts` |

### 2.4 Realtime Listeners (Client `onSnapshot`)

| File:line | Collection / query |
|-----------|-------------------|
| `src/components/Banner.tsx:31` | `banners` (active) |
| `src/hooks/useCheckoutState.ts:78,84` | `adminSettings/global`, `tenants/{id}` |
| `src/components/AIAssistant.tsx:47` | `adminSettings/global` |
| `src/pages/AdminPanel.tsx:250,279,284,290,302,310,322` | menu, coupons, reviews, banners, subscriptions, categories, supportTickets |
| `src/pages/SubscriptionPage.tsx:83` | `subscriptions` |
| `src/components/OrderTracking.tsx:280` | `orders/{id}` |
| `src/components/CourierTrackingTimeline.tsx:54` | `courierDispatches` |
| `src/services/api.ts:686,703,753` | `orders` (guest batch, user list, single) |

OrderBhojan: **no `onSnapshot` usage found** in `orderbhojan/src/` — polling/HTTP only for orders and tracking.

### 2.5 Duplicate Sources of Truth

| Domain | Source A | Source B | Risk |
|--------|----------|----------|------|
| **User identity** | `users/{uid}` (BhojanOS client) | `customers/{uid}` (OrderBhojan + marketplace API) | Split schemas; FCM tokens in both patterns |
| **Addresses** | Embedded in `users/{uid}` (`Checkout.tsx`, `Addresses.tsx`) | `customers/{uid}/addresses` (OrderBhojan) | Same user, two address stores |
| **Menu** | Client Firestore (`Home`, `Menu`, `Checkout`) | `/api/menu`, `/api/owner/menu/*`, marketplace validate | Owner path migrating to API; storefront still direct |
| **Orders** | Client Firestore (`api.ts` listeners) | `/api/orders/*`, `/api/marketplace/orders/*`, OrderSDK polling | Triple path; auth enforcement optional on legacy |
| **Order drafts** | Client `stageOrderDraft` | Server `promoteDraftTransaction` | Intentional split; promotion server-only |
| **Discovery** | Client reads `tenants` (`firestoreTenantReadPort.ts`) | Server reads `discovery_profiles` + visibility filter | Client may bypass projection layer |
| **Owner tenant list** | Client `ownerAccess.ts` Firestore reads | `/api/owner/sync-tenants` | Same `ownedTenantIds`, two hydration paths |
| **Analytics** | Client writes `tenants/.../analytics` | Server aggregates from `orders` (`ownerAnalyticsRoutes.ts`) | Counters may diverge |
| **Reviews** | Client `addDoc` (`Menu.tsx`, `MyOrders.tsx`) | Server `/api/reviews/submit` batch | Duplicate write paths |
| **Payment audit** | Client `paymentProofs` | Server `payment_verifications` | Two audit collections |
| **Notifications** | Client `NotificationRepository` (Firestore) | Server `notification_outbox` + worker | Parallel notification pipelines |
| **Admin settings** | 4+ independent listeners on `adminSettings/global` | `/api/admin/settings` | Same doc, many subscriptions |
| **Restaurant ID** | `tenantId` (owner) | `restaurantId` / `slug` / `rest_*` / `obr_*` (OrderBhojan) | Synthetic ID fallbacks — `orderbhojan/src/features/restaurant/store/restaurantContextStore.ts:43-45` |

---

## 3. MULTI-TENANCY & SECURITY

### 3.1 Tenant / Kitchen Isolation Model

**Terminology:** No `kitchenId` field in TS/TSX. Kitchens are **`tenants/{tenantId}`** with optional **`slug`**. OrderBhojan DTOs use **`restaurantId`**.

| Mechanism | Location | Enforcement |
|-----------|----------|-------------|
| Firestore menu query | `backend-lib/marketplace/menuTenantQuery.ts:3-16` | `where('tenantId', 'in', [docId, slug])` |
| Client menu query | `src/lib/menuTenantKeys.ts:1-10` | Same dual-key pattern |
| Marketplace visibility | `backend-lib/marketplace/marketplaceVisibility.ts:1-25` | Only `storeStatus === 'published'`, not `sandboxMode` |
| Owner API | `assertOwnerTenantAccess` — `server.ts:2858-2926` | Checks `tenants.ownerId`, `users.ownedTenantIds`, slug resolution, founder/admin bypass |
| Owner routes bypass global tenant middleware | `server.ts:1094-1108` | `/api/owner/*` skips `x-tenant-id` validation |
| Default tenant fallback | `server.ts:1132` | **`mana-inti`** if header/query missing |
| Firestore rules | `firestore.rules:23-27` | `isTenantOwner` via `ownedTenantIds` array |
| Public tenant reads | `firestore.rules` ~306-307 | **All tenant docs readable without auth** |
| Public menu reads | `firestore.rules` ~121-122 | **All menu items world-readable** |

**Assumed but not fully checked:**

1. **`POST /api/marketplace/checkout/place`** — no auth middleware; scopes by `restaurantId` in body only — `marketplaceRoutes.ts:661-664`, `projectCheckout.ts:261-268` accepts client-supplied `userId`.
2. **Guest tracking** — last-4 phone digits — `marketplaceRoutes.ts:778-791`, `projectMarketplaceOrders.ts:333+`.
3. **KYC inline upload** — checks `ownedTenantIds.includes(tenantId)` only, no slug resolution — `server.ts:1007-1010` vs full `assertOwnerTenantAccess` at `2858+`.
4. **API gateway tenant resolver** — trusts client `x-tenant-id` / body without validation — `backend-lib/shared/apiGatewayMiddleware.ts:35-48` (routes re-check separately).
5. **Quota backoff** — invalid tenants may proceed during Firestore quota pause — `server.ts:1150-1174,1200-1202`.

### 3.2 Hardcoded Credentials, Keys, and Secrets

| Severity | Finding | File:line |
|----------|---------|-----------|
| **CRITICAL** | Admin password plaintext | `create-admin.mjs:17-18` — `ADMIN_PASSWORD = 'Kalyan@1990@@'` |
| **CRITICAL** | Live Razorpay key fallback in checkout | `src/pages/Checkout.tsx:579` — `rzp_live_Sjcjj19nnWXEzX` |
| **CRITICAL** | Same Razorpay fallback | `src/pages/SubscriptionPage.tsx:303` |
| **HIGH** | Full Firebase web config (bhojanos2) committed | `firebase-applet-config.json:2-8`, consumed by `create-admin.mjs:11` |
| **HIGH** | Same config as dev fallback in frontend bundle | `src/config/firebaseClientConfig.ts:5-13` — `AIzaSyBBKia1hM4ZU0hYS52dTy63KTkwzZFYzgI` |
| **HIGH** | Weak biometric salt default | `server.ts:4542` — `'mana-inti-salt'` if `BIOMETRIC_SALT` unset |
| **MEDIUM** | Founder email hardcoded in server | `server.ts:351,1238,2699-2703` — `manaintibojanamtpt@gmail.com` |
| **MEDIUM** | `/api/env-debug` exposes non-secret env vars | `server.ts:1212-1221` |
| **MEDIUM** | PII in committed exports | `users.json`, `accounts.json` (if present in repo) |
| **LOW** | Test-only secrets | `backend-lib/__tests__/guestOrderToken.test.ts`, `scripts/security/api-security.test.ts` |
| **LOW** | Mock Razorpay in MSW | `orderbhojan/src/marketplace-api/mocks/handlers.ts:225` — `rzp_test_mock` |

### 3.3 Authentication Flows

#### 3.3.1 Firebase ID token (server)

```591-604:server.ts
const verifyFirebaseToken = async (req, res, next) => {
  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await getAdminAuth(appAdmin).verifyIdToken(token);
  req.user = decodedToken;
  next();
};
```

Admin layers: `requireAdmin` (`607-616`), `requireSuperadmin` (`618-652`) — Firestore role + founder emails.

#### 3.3.2 Owner login (BhojanOS)

1. `src/pages/owner/OwnerLogin.tsx` — Firebase email/password or Google
2. `resolveOwnerTenantIds` + `cacheOwnerTenantIds` cached client-side
3. `AuthContext.tsx` hydrates via `/api/owner/profile` on owner paths
4. API calls: `src/lib/ownerProvisioning.ts:64-86` — `Authorization: Bearer ${token}` + explicit `tenantId`
5. Active kitchen: `sessionStorage` key `owner_active_tenant_id` — `src/lib/ownerActiveTenant.ts:3-42`

Separate bootstrap entry: `src/ownerAuthBootstrap.tsx` for `/owner/login`, `/owner/register`.

#### 3.3.3 Customer login (OrderBhojan)

`orderbhojan/src/features/auth/infrastructure/firebaseAuth.ts`:
- Google popup (`60-66`)
- Anonymous guest (`68-82`)
- Phone OTP + reCAPTCHA (`84-116`)

Token wired to marketplace client: `orderbhojan/src/shared/providers/AuthProvider.tsx:146-152` → `MarketplaceHttpClient` adds Bearer — `orderbhojan/src/marketplace-api/client.ts:80-99`.

#### 3.3.4 Guest order JWT

HMAC JWT scoped to single `orderId` — `backend-lib/guestOrderToken.ts:52-77`.  
Secret **required** (no fallback) — `guestOrderToken.ts:36-44`.  
Issued after phone verification — `server.ts:4013-4055`.  
Parsed as `Authorization: Guest <jwt>` — `guestOrderToken.ts:138-148`.

#### 3.3.5 Legacy order read access (feature-flagged)

```191-194:backend-lib/orderAccess.ts
export const isOrderAuthEnforced = (): boolean => {
  const value = (process.env.FF_ORDER_AUTH_ENFORCE || '').trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
};
```

When enforcement is **off** (default), blocked reads are logged but **allowed**:

```742-745:server.ts
if (!isOrderAuthEnforced()) {
  logOrderAccessWouldBlock(decision, { orderId, method: req.method });
  return true;
}
```

#### 3.3.6 Sensitive operation gates (summary)

| Operation | Auth | Tenant/user scope |
|-----------|------|-------------------|
| Owner menu/orders/KYC | `verifyFirebaseToken` + `assertOwnerTenantAccess` | Per `tenantId` query/body |
| Marketplace order list/get | `verifyFirebaseToken` | `userId === req.user.uid` — `marketplaceRoutes.ts:682-717` |
| Marketplace checkout place | **None** | `restaurantId` in body — `marketplaceRoutes.ts:661` |
| Legacy GET `/api/orders/:id` | Optional Bearer or Guest JWT | `enforceOrderReadAccess` — optional enforce |
| Guest marketplace tracking | Phone last-4 only | `marketplaceRoutes.ts:778-791` |
| Razorpay create/verify | Mixed | `strictLimiter`; draft bind flag `FF_RAZORPAY_DRAFT_BIND` |

---

## 4. RATE LIMITING / QUOTA PROTECTION

### 4.1 HTTP Rate Limiting (`express-rate-limit` in `server.ts`)

| Limiter | Definition | Window / max | Applied to |
|---------|------------|--------------|------------|
| `globalLimiter` | `server.ts:531-548` | 15 min / **100** prod, 50k dev | All `/api/*` — `server.ts:549` |
| `strictLimiter` | `server.ts:551-556` | 15 min / **20** | Sensitive routes (see below) |
| `guestViewTokenLimiter` | `server.ts:558-564` | 1 hr / **5** | Guest order token issuance |
| `clientErrorIpLimiter` | `server.ts:566-572` | 5 min / 60 prod | `/api/client-errors` |
| `clientErrorTenantLimiter` | `server.ts:574-588` | 5 min / 120 prod | Per-tenant client errors |

**`globalLimiter` skips:** `/marketplace/sync/revision`, `/marketplace/health`, `/api/health`; in dev, all `/marketplace` URLs — `server.ts:536-547`.

**`strictLimiter` routes (representative):** `/api/register-owner-check` (`2637`), owner provision (`3219`), Razorpay (`3446`), biometric (`4498`, `4527`), KYC register (`4563`), AI chat (`5397`), KYC inline upload (`971`).

**Owner API gateway** does not add a separate limiter — `server.ts:2812-2813`; relies on `globalLimiter` only. No per-tenant or per-owner HTTP throttle.

### 4.2 Firestore Quota Circuit Breaker

| Component | File | Behavior |
|-----------|------|----------|
| Server backoff | `server.ts:102-125` | `noteFirestoreQuotaExceeded`; pauses non-critical reads for `FIRESTORE_QUOTA_BACKOFF_MS` (default 15 min) |
| Client mirror | `src/lib/firestoreRetryPolicy.ts` | `FirestoreQuotaError`, circuit breaker |
| Incident writes | `backend-lib/observability/IncidentRepository.ts:99,124-125` | Skips writes during backoff |

### 4.3 External API Throttling

| Component | File | Scope |
|-----------|------|-------|
| OpenGeocoding rate limiter | `src/sdk/location/providers/open-geocoding/OpenGeocodingRateLimiter.ts:9-42` | Nominatim geocoding only; interval-based |
| No `bottleneck` npm usage | — | — |

### 4.4 Paths NOT Covered by Dedicated Rate Limits

| Path | Risk |
|------|------|
| `POST /api/marketplace/checkout/place` | Global limiter only (100/15min/IP) — `marketplaceRoutes.ts:661` |
| `POST /api/marketplace/quote`, `/checkout/prepare` | Same |
| Guest marketplace tracking | No dedicated limiter — `marketplaceRoutes.ts:778+` |
| Firestore client writes (menu, orders from browser) | **No server rate limit**; subject to Firebase rules + project quotas only |
| `/api/env-debug` | No rate limit — `server.ts:1212` |
| Cron routes | Protected by `CRON_SECRET` when set; inconsistent if unset — `server.ts:359,4744,5518` |
| Webhook endpoints | `/api/webhooks/*` bypass tenant middleware — `server.ts:1101` |

---

## 5. DEPLOYMENT & CONFIG

### 5.1 Build & Start Scripts

| Package | Script | Command | Output |
|---------|--------|---------|--------|
| Root | `build` | `vite build && esbuild server.ts …` | `dist/` SPA + `dist/server.cjs` — `package.json:19` |
| Root | `build:web` | `verify-vercel-firebase-env.mjs` + `write-version-json.mjs` + `vite build` | Vercel-oriented `dist/` — `package.json:20` |
| Root | `build:server` | `scripts/build-server.mjs` | Server bundle only — `package.json:21` |
| Root | `start` | `node dist/server.cjs` | Render production — `package.json:22` |
| Root | `deploy` | `npm run build && firebase deploy --only hosting` | Root Firebase hosting — `package.json:24` |
| Root | `dev` | `tsx server.ts` | Local API + Vite — `package.json:9` |
| OrderBhojan | `build` | `tsc --noEmit && vite build` | `orderbhojan/dist/` — `orderbhojan/package.json:10` |
| OrderBhojan | `gate:prod` | Unit tests + production build | CI gate — `orderbhojan/scripts/gate-prod.mjs:51-52` |
| Functions | `deploy` | `firebase deploy --only functions` | `functions/package.json` |

### 5.2 Deployment Targets

| Artifact | Platform | Config | URL (documented) |
|----------|----------|--------|------------------|
| BhojanOS SPA + marketing | **Vercel** | `vercel.json` | `bhojanos.com` — `.env.example:6` |
| API | **Render** | `render.yaml` | `manaintibojanam-backend.onrender.com` |
| Founder storefront | **Firebase Hosting** | `firebase.json` target `storefront` | `mana-inti-bojanam-pune-492610.web.app` — `.firebaserc:9-13` |
| BhojanOS SaaS hosting target | **Firebase Hosting** | target `saas` | `bhojanos-prod` |
| OrderBhojan | **Firebase Hosting** | `orderbhojan/firebase.json` | `orderbhojan.web.app` |
| Staging spine (future) | **GKE** | `helm/`, `.github/workflows/iac-deploy-staging.yml` | Not production path today |

**Vercel API proxy:** all `/api/*` → Render — `vercel.json:52-55`.

**OrderBhojan dev proxy:** `orderbhojan/vite.config.ts:51-79` → marketplace backend.

**No CI auto-deploy for OrderBhojan Firebase Hosting** — `.github/workflows/orderbhojan-ci.yml` runs `gate:prod` only; deploy is manual.

### 5.3 Production vs Development Logic

| Check | Location | Behavior |
|-------|----------|----------|
| Rate limit tiers | `server.ts:529-533` | 100 vs 50k req/15min |
| Firebase config | `src/config/firebaseClientConfig.ts:60+` | Prod hosts must not use `DEV_FIREBASE`; runtime bootstrap via `/api/client-config` |
| Vercel build gate | `scripts/verify-vercel-firebase-env.mjs` | Validates Firebase env before `build:web` |
| GA-1 production flags | `scripts/ga1/verify-production-legacy-flags.mjs` | 28 projection flags must be OFF — `scripts/flags/ga1-production-flags.json` |
| OrderBhojan prod flags | `orderbhojan/src/featureFlags/flags.ts:55-68` | Auto-enables live Firestore cascade when `PROD` |
| MSW mocks | `orderbhojan/src/config/environment.ts:79` | Disabled in production builds |
| Platform tier | `PLATFORM_TIER` / `VITE_PLATFORM_TIER` | Controls crons, workers, telemetry — `.env.example:24-25` |
| Health endpoint | `server.ts:1225+` | Reports email/WhatsApp/Firebase configuration state |

### 5.4 CI Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ga1-production-verify.yml` | push/PR `main` | GA-1 flags, security, builds |
| `ga2-stabilization-verify.yml` | push/PR `main` | GA-2 readiness |
| `orderbhojan-ci.yml` | push/PR `main` | OrderBhojan `gate:prod` |
| `iac-terraform-plan.yml` | PR / dispatch | Terraform plan |
| `iac-deploy-staging.yml` | dispatch | GKE Helm deploy |

---

## 6. RISKS & INCONSISTENCIES

### 6.1 Security & Isolation Risks (Priority Order)

| # | Risk | Evidence |
|---|------|----------|
| 1 | **Order read auth off by default** | `FF_ORDER_AUTH_ENFORCE` default false — `orderAccess.ts:191-194`; bypass at `server.ts:742-745` |
| 2 | **Public checkout without caller binding** | `marketplaceRoutes.ts:661`; `userId` from body — `projectCheckout.ts:265` |
| 3 | **Guest tracking weak verification** | Last-4 phone; no dedicated rate limit |
| 4 | **World-readable tenants and menu** | `firestore.rules` |
| 5 | **Hardcoded live Razorpay + Firebase keys** | `Checkout.tsx:579`, `firebaseClientConfig.ts:5-13` |
| 6 | **Admin password in repo** | `create-admin.mjs:17-18` |
| 7 | **Default tenant `mana-inti`** | Misconfigured clients hit founder tenant — `server.ts:1132` |
| 8 | **Biometric weak salt default** | `server.ts:4542` |
| 9 | **env-debug in production** | `server.ts:1212-1221` |
| 10 | **Client writes to collections without rules** | `courierDispatches`, `client_errors`, forecasts — see §2.2 |

### 6.2 Unfinished / Stub Code

| Item | File:line |
|------|-----------|
| Porter API integration | `src/services/courierAdapters.ts:58,101` — `TODO: Replace with actual Porter API call` |
| Rapido API integration | `src/services/courierAdapters.ts:178,220` |
| Courier pickup address | `src/components/admin/CourierBookingModal.tsx:48` — hardcoded |
| Placeholder support phone | `src/services/EmailService.ts:80,153,279` — `+91-XXXX-XXXX-XX` |
| Stripe / alt payments | `src/lib/payments/PaymentFactory.ts:15-19` |
| Firebase Functions exports | `functions/index.js:12-15` — empty stub |
| `socket.io` dependency unused | `package.json` — no imports |

### 6.3 Duplicate Implementations

| Duplication | Paths |
|-------------|-------|
| `loadTenantDocBySlug` | `backend-lib/marketplace/marketplaceTenantLoader.ts:4-19` **and** inline `marketplaceRoutes.ts:86-102` |
| Owner menu CRUD | `server.ts:2929-3045` **and** `backend-lib/marketplace/ownerMenuRoutes.ts` |
| Founder email check | `server.ts:2696-2704`, `src/config/founder.ts:12-15`, `firestore.rules:115-116,311-312` |
| OrderBhojan mirror tree | `.sync-work/orderbhojan-export/` duplicates `orderbhojan/` |
| Legacy vs marketplace order APIs | `server.ts:/api/orders` vs `backend-lib/marketplace/marketplaceRoutes.ts` |

### 6.4 Inconsistent Naming & Patterns

| Pattern | Examples |
|---------|----------|
| `tenantId` vs `restaurantId` vs `slug` | Owner portal vs OrderBhojan vs Firestore menu `tenantId` field |
| `packagingFee` vs `packingFee` | `projectCheckout.ts:37-38` reads both |
| Synthetic ID prefixes | `rest_`, `obr_`, `rest_${slug}` — `restaurantContextStore.ts:43-45` |
| "Kitchen" in UI vs "tenant" in code | `ownerPortalRoutes.ts:36` error message vs field names |
| Payment audit collections | `paymentProofs` vs `payment_verifications` |

### 6.5 Deprecated / Transitional Code

| Item | Location |
|------|----------|
| `POST /api/orders` deprecated | `server.ts:3725+`, sunset headers on PATCH — `server.ts:761-763` |
| `readCachedTenant` deprecated | `src/lib/tenantPath.ts:34-36` |
| `tenantSyncService` deprecated emitters | `backend-lib/marketplace/tenantSyncService.ts:73,127` |
| Per-route auth during gateway rollout | `apiGatewayMiddleware.ts:20-21`, `server.ts:2814` |
| Legacy `server/server.js` | Superseded by `server.ts` |
| GA-1 projection flags OFF | SDK/strangler infrastructure dormant — `docs/PROGRAM-STATUS.md`, `scripts/ga1/` |

### 6.6 Architectural Fragility

1. **Dual frontend + dual Firebase projects + single API** — config drift between Vercel, Render, and three Firebase projects (`.firebaserc`, `orderbhojan` separate hosting).
2. **Partial API migration** — storefront still uses direct Firestore while owner portal uses HTTP; increases rule surface and duplicate logic.
3. **Feature-flag matrix complexity** — 28+ GA-1 flags, OrderBhojan prod auto-cascade, SDK flags; easy to misconfigure.
4. **Free-tier quota sensitivity** — circuit breakers exist but client-side listeners (`AdminPanel`, `api.ts` order subscriptions) can burn reads — `.env.example:17` warns against dual Vercel+Firebase hosting deploy.
5. **OrderBhojan sync** — monorepo `orderbhojan/` synced to separate repo via `npm run sync:orderbhojan-repo:push` — drift risk if sync not run.
6. **IaC vs actual prod** — Terraform/GKE/Helm present but production is Vercel+Render+Firebase; two architectural stories in one repo.

### 6.7 TODO / FIXME Inventory (committed source)

| File:line | Text |
|-----------|------|
| `src/services/courierAdapters.ts:58` | `TODO: Replace with actual Porter API call` |
| `src/services/courierAdapters.ts:101` | Same |
| `src/services/courierAdapters.ts:178` | `TODO: Replace with actual Rapido API call` |
| `src/services/courierAdapters.ts:220` | Same |
| `src/components/admin/CourierBookingModal.tsx:48` | `TODO: Get from config` (pickup address) |

---

## Appendix A — Key File Index

| Concern | Primary files |
|---------|---------------|
| API monolith | `server.ts` |
| Marketplace module | `backend-lib/marketplace/marketplaceRoutes.ts`, `projectCheckout.ts`, `projectMarketplaceOrders.ts` |
| Order access policy | `backend-lib/orderAccess.ts` |
| Guest tokens | `backend-lib/guestOrderToken.ts` |
| Owner access | `server.ts:2858+`, `src/lib/ownerAccess.ts`, `src/lib/ownerProvisioning.ts` |
| Firestore rules | `firestore.rules`, `storage.rules` |
| BhojanOS bootstrap | `src/main.tsx`, `src/appBootstrap.tsx`, `src/App.tsx` |
| OrderBhojan bootstrap | `orderbhojan/src/main.tsx`, `orderbhojan/src/app/App.tsx` |
| Client Firestore legacy | `src/services/api.ts` |
| Deploy configs | `vercel.json`, `render.yaml`, `firebase.json`, `orderbhojan/firebase.json`, `.firebaserc` |
| Env templates | `.env.example`, `orderbhojan/.env.example` |

---

## Appendix B — Recommended Follow-Up (Documentation Only)

This audit did not modify code. Highest-impact remediation targets for a future engineering pass:

1. Enable `FF_ORDER_AUTH_ENFORCE=true` on Render production after verifying clients send tokens.
2. Remove hardcoded Razorpay live key and Firebase `DEV_FIREBASE` from committed source; rotate exposed keys.
3. Bind marketplace checkout `userId` to verified Firebase token (or guest flow explicitly).
4. Consolidate user/customer/address data models.
5. Complete migration of storefront reads off direct Firestore to marketplace API.
6. Add dedicated rate limiting on guest tracking and checkout placement.
7. Add CI workflow for OrderBhojan Firebase deploy (optional) or document manual deploy runbook.

---

*End of architecture audit.*
