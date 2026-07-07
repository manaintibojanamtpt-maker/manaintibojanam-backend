# BhojanOS Capability Registry

**Version:** 1.0 · **Phase:** 6 (Production Modernization)  
**Purpose:** Single source of truth for capability ownership across Presentation, SDK, and Server layers.

---

## Ownership Model

| Layer | Role |
|-------|------|
| **Presentation** | React pages/components — import facades in `src/lib/*`, never Firestore directly |
| **SDK** | Strangler boundary (`src/sdk/*`) — domain contracts, read adapters, certification |
| **Server** | Authoritative writes and migrations (`backend-lib/marketplace/*`, `server.ts`) |
| **Services** | Legacy client orchestration (`src/services/*`) — being absorbed into lib/SDK |

**Rule:** One *authoritative write path* per capability. Reads may dual-path behind feature flags until SDK cutover.

---

## Capability Matrix

| Capability | Authoritative Owner | Presentation Entry | SDK Module | Server / API | Status |
|------------|--------------------|--------------------|------------|--------------|--------|
| **OrderSDK** | `src/sdk/orders/` + `src/sdk/order/` | `src/lib/ownerOrdersReads.ts`, `src/lib/myOrdersReads.ts`, `src/lib/orderTrackingReads.ts` | `OrderSDK`, projection adapters | `backend-lib/marketplace/ownerOrdersRoutes.ts` | SDK frozen v1.0; owner reads default to API polling (`FF_SDK_OWNER_ORDERS_ENABLED` OFF) |
| **Menu** | `backend-lib/marketplace/ownerMenuRoutes.ts` | `src/lib/menu/MenuFacade.ts`, `src/lib/ownerMenuApi.ts` | `src/sdk/menu/` (MenuSDK) | Menu normalization + tenant menu queries | Facade → SDK strangler; stock counts live on menu items |
| **Inventory** | `backend-lib/marketplace/ownerMenuRoutes.ts` (stock ops) | `src/services/InventoryService.ts`, `src/lib/ownerMenuApi.ts` | — (no SDK module) | Stock reserve/release via menu item API | No dedicated inventory page; dashboard reads `stockCount` from menu |
| **Recipe** | `backend-lib/marketplace/ownerRecipesRoutes.ts`, `ownerIngredientsRoutes.ts` | `src/lib/ownerRecipesApi.ts`, `src/lib/ownerIngredientsApi.ts`, `src/pages/owner/OwnerRecipes.tsx` | — | `recipeCostEngine.ts`, `recipeConsumptionService.ts`, `recipeSuggestService.ts` | Growth-plan feature (`predictiveSupply`) |
| **Notification** | `src/modules/notifications/NotificationRepository.ts` | `src/modules/notifications/*` (UI, hooks, engine) | — | `TenantNotificationWorker.ts` (server) | ⚠️ Overlaps with `src/services/NotificationService.ts` (FCM push) — see Duplicates |
| **Payment** | `backend-lib/paymentGate.ts`, `backend-lib/paymentAudit.ts` | `src/lib/payments/PaymentFactory.ts`, providers (Razorpay, COD) | — | Razorpay webhook + audit in `server.ts` | Client initiates; server verifies |
| **Analytics** | `backend-lib/marketplace/ownerAnalyticsRoutes.ts` | `src/lib/ownerAnalyticsApi.ts`, `src/lib/ownerOrderAnalytics.ts`, `src/services/AnalyticsService.ts` | — | Analytics migration tests in marketplace | Owner dashboard metrics + event tracking |
| **Forecast** | `backend-lib/marketplace/recipeForecastService.ts` | `src/services/InventoryForecastService.ts`, `src/services/ForecastingService.ts`, `ForecastPanel.tsx` | — | Consumption + forecast API on recipe routes | "Create PO" in ForecastPanel still placeholder |
| **Delivery** | `backend-lib/marketplace/projectLocation.test.ts` domain | `src/lib/deliveryFee.ts`, `src/lib/useDeliveryState.ts`, `src/lib/checkout/CheckoutBranchFacade.ts`, `src/services/ServiceabilityService.ts` | `src/sdk/location/`, `src/sdk/branch/`, `src/sdk/discovery/` | Branch assignment + serviceability | Checkout uses BranchFacade pre-payment |
| **Customer** | `backend-lib/marketplace/marketplaceCustomerRoutes.ts` | `src/lib/customerLocation/CustomerLocationFacade.ts`, `src/pages/owner/OwnerCustomers.tsx`, `src/services/CustomerIntelligenceService.ts` | — | Customer segment + marketplace customer API | Location facade wraps LocationSDK (flagged) |
| **Tenant** | Firestore `tenants/{id}` + `backend-lib/marketplace/marketplaceTenantLoader.ts` | `src/context/TenantContext.tsx`, `src/lib/tenantPath.ts`, `src/lib/tenantPwaManifest.ts` | — | `tenantSyncService.ts`, `tenantDomainEventBus.ts` | Validated session cache only after Firestore success |

---

## Layer Detail by Capability

### OrderSDK
- **Contract:** `src/sdk/orders/OrderSDK.ts`, frozen read API v1.0
- **Adapter stack:** `src/sdk/order/adapter/*` (legacy vs projection)
- **Presentation flags:** `src/lib/sdkFeatureFlags.ts` — `FF_SDK_ORDERTRACKING_ENABLED`, `FF_SDK_MYORDERS_ENABLED`, `FF_SDK_OWNER_ORDERS_ENABLED`
- **Operational path today:** `ownerOrdersReads → ownerOrdersApi → /api/owner/orders`

### Menu
- **Facade:** `src/lib/menu/MenuFacade.ts` (`FF_MENU_ENABLED`, default OFF)
- **Owner CRUD:** `src/lib/ownerMenuApi.ts` → `/api/owner/menu`
- **SDK:** `src/sdk/menu/` — full projection/parity/certification stack (not wired to production UI)

### Inventory
- **Stock mutations:** `InventoryService.ts` → `ownerMenuApi.updateOwnerMenuItemStock`
- **Low-stock signals:** menu item fields polled on owner dashboard
- **Migration intent:** `backend-lib/marketplace/__tests__/ownerInventoryMigration.test.ts`

### Recipe
- **API client:** `src/lib/ownerRecipesApi.ts`, `src/lib/ownerIngredientsApi.ts`
- **Server engines:** cost, consumption, forecast, suggest in `backend-lib/marketplace/`
- **UI:** `OwnerRecipes.tsx` (Recipes | Ingredients | Forecast tabs)

### Notification
- **In-app + rules:** `src/modules/notifications/` (Repository, Engine, Templates, Providers)
- **Push (FCM):** `src/services/NotificationService.ts` — separate from modules/notifications
- **Server worker:** `src/modules/notifications/server/TenantNotificationWorker.ts`

### Payment
- **Client providers:** `src/lib/payments/` (Razorpay, COD, DirectUPI stub)
- **Verification:** `src/services/PaymentVerificationService.ts`
- **Server gate:** `backend-lib/paymentGate.ts`

### Analytics
- **Owner API:** `src/lib/ownerAnalyticsApi.ts`
- **Order analytics helper:** `src/lib/ownerOrderAnalytics.ts`
- **Event sink:** `src/services/AnalyticsService.ts` → owner analytics routes
- **Marketplace search analytics:** `src/lib/marketplace/searchAnalytics.ts` (discovery domain, not owner ops)

### Forecast
- **Server:** `recipeForecastService.ts`, `recipeConsumptionService.ts`
- **Client services:** `InventoryForecastService.ts`, `ForecastingService.ts`, `ForecastAccuracyService.ts`, `ForecastSimulationService.ts`
- **UI:** `src/components/owner/recipes/ForecastPanel.tsx`

### Delivery
- **Fee math:** `src/lib/deliveryFee.ts`
- **Branch resolution at checkout:** `src/lib/checkout/CheckoutBranchFacade.ts`
- **SDK (future):** LocationSDK, BranchSDK, DiscoverySDK under `src/sdk/`
- **Courier adapters:** `src/services/courierAdapters.ts`

### Customer
- **Location/session:** `src/lib/customerLocation/*`
- **Owner CRM surface:** `OwnerCustomers.tsx`
- **Intelligence:** `CustomerIntelligenceService.ts`, `customerSegmentLogic.ts`

### Tenant
- **Resolution:** `TenantContext.tsx` — Firestore `tenants` doc or slug query; owner panel uses `ownedTenantIds[0]`
- **Cache:** `tenantPath.ts` — validated session cache (`validatedAt`) written only after successful Firestore fetch
- **PWA branding:** `tenantPwaManifest.ts` for storefront `/k/{slug}` routes
- **Server sync:** `tenantSyncService.ts`, `tenantDomainEventBus.ts`

---

## Duplicate Audit (`src/sdk/` vs `src/lib/`)

Audit date: 2026-07-07. Findings are **parallel implementations** (strangler / migration), not necessarily bugs.

| Domain | SDK Path | Lib / Services Path | Verdict |
|--------|----------|---------------------|---------|
| Orders | `src/sdk/orders/`, `src/sdk/order/` | `ownerOrdersReads`, `ownerOrdersApi`, `orderTrackingReads`, `myOrdersReads` | **Active dual path.** SDK is authoritative contract; lib/API is production default. Consolidate via `FF_SDK_*` flags. |
| Menu | `src/sdk/menu/` | `src/lib/menu/MenuFacade`, `ownerMenuApi` | **Strangler.** Facade delegates to MenuSDK when `FF_MENU_ENABLED`. Owner writes stay on API. |
| Pricing | `src/sdk/pricing/` | `src/lib/pricing/PricingFacade` | **Strangler (flagged).** Not in top-level registry name but overlaps checkout totals. |
| Search / Discovery | `src/sdk/search/`, `src/sdk/discovery/` | `src/lib/search/SearchFacade`, `src/lib/marketplace/*`, `src/lib/discovery/*` | **Strangler.** Marketplace home/search uses lib facades. |
| Branch / Location | `src/sdk/branch/`, `src/sdk/location/` | `src/lib/branch/*`, `src/lib/checkout/*`, `customerLocation/*` | **Strangler.** Checkout branch assignment uses lib facades. |
| Events / Projections | `src/sdk/events/` | — (server-side workers) | **Server-only runtime.** SDK is certification + adapter layer. |
| Inventory | — | `InventoryService`, `ownerMenuApi` (stock) | **No SDK duplicate.** Single lib+API path. |
| Recipe / Forecast | — | `ownerRecipesApi`, `InventoryForecastService`, forecast services | **No SDK duplicate.** Server engines + lib clients. |
| Notification | — | `modules/notifications/*` **and** `services/NotificationService.ts` | **⚠️ Internal duplicate.** Two "NotificationService" classes — modules (in-app/rules) vs services (FCM). Rename or merge in future PR. |
| Payment | — | `lib/payments/*`, `PaymentVerificationService` | **No SDK duplicate.** |
| Analytics | — | `ownerAnalyticsApi`, `AnalyticsService`, marketplace search analytics | **Partial overlap** — owner ops vs marketplace discovery analytics are separate concerns. |
| Tenant | — | `TenantContext`, `tenantPath`, `firestoreTenantReadPort` | **No SDK duplicate.** Single context + validated cache. |

### Recommended Consolidation Order
1. **OrderSDK** — enable `FF_SDK_OWNER_ORDERS_ENABLED` after parity certification
2. **Menu** — enable `FF_MENU_ENABLED` on storefront reads
3. **Notification** — merge FCM push from `services/NotificationService` into `modules/notifications`
4. **Inventory / Recipe / Forecast** — introduce SDK modules only if cross-surface contracts are needed; today server+lib is sufficient

---

## Import Rules

```typescript
// ✅ Presentation
import { subscribeOwnerOrders } from '@/lib/ownerOrdersReads';
import { MenuFacade } from '@/lib/menu/MenuFacade';

// ✅ SDK (facades and adapters only)
import { createOrderSDK } from '@/sdk';

// ❌ Never in pages/components
import { getDoc } from 'firebase/firestore';
import { createMenuSDK } from '@/sdk/menu/factory/createMenuSDK'; // use facade
```

Enforced by: `npm run lint:presentation`

---

## Related Documents

- `src/sdk/README.md` — SDK strangler rules
- `PRODUCTION_AUDIT_REPORT.md` — Phase 6–10 modernization plan
- `docs/orderbhojan/ARCHITECTURE-v1.0.md` — marketplace boundary (OrderBhojan app)

---

*Maintainers: update this file when adding a capability, splitting an owner, or completing an SDK cutover.*
