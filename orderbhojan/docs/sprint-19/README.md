# Sprint 19 — Real Owner Storefront Synchronization

**Status:** Complete (Firestore → Marketplace API → OrderBhojan path)  
**Prior:** Sprint 18 MSW contract v1 layer

---

## Mission

Owner edits in BhojanOS → Firestore → Marketplace API → OrderBhojan renderer (no layout changes).

---

## Department Reports

### Platform Engineering — **PASS**

**Completed:** Tenant `marketplace` embed schema; menu composite indexes; tenant owner write rules; seed script.

**Files:** `src/domain/storefront/tenant-marketplace.ts`, `firestore.rules`, `firestore.indexes.json`, `scripts/seed-storefront-sprint19.ts`

**Tests:** `backend-lib/marketplace/__tests__/projectFoodMenuV1.test.ts`

**Blockers:** None

**Integration:** Checkpoint 1 PASS

**Next:** Full `restaurants/` subcollection migration (PX6.1B full)

---

### Owner Experience — **PARTIAL PASS**

**Completed:** `GET/PUT /api/owner/storefront/:tenantId`; menu API already accepts labels, offer, variants, addons (Sprint 18).

**Files:** `backend-lib/marketplace/ownerStorefrontRoutes.ts`, `server.ts`

**Blockers:** Dedicated owner UI editors for gallery/theme/merchandising deferred to PX6.1C

**Integration:** Checkpoint 1 PASS (API); UI editors pending

**Next:** Gallery Manager + Offer Editor UI

---

### Marketplace API — **PASS**

**Completed:** Firestore readers; `FoodMenuDTO` v1 projection; restaurant/gallery/offers/highlights endpoints.

**Files:** `backend-lib/marketplace/**`, `server.ts` route registration

**Endpoints:**
- `GET /api/marketplace/restaurants/:slug/menu?schemaVersion=1.0`
- `GET /api/marketplace/restaurants/:slug`
- `GET /api/marketplace/restaurants/:slug/gallery|offers|highlights`

**Tests:** Projection unit tests

**Integration:** Checkpoint 2 PASS

**Next:** Caching layer + discovery Firestore projection

---

### OrderBhojan — **PASS**

**Completed:** `FF_OB_FIRESTORE` flag; MSW auto-disabled when Firestore sync on; Vite proxy to backend; contract menu path when Firestore or Contract v1.

**Files:** `featureFlags/flags.ts`, `config/environment.ts`, `vite.config.ts`, `foodExperienceLayer.ts`

**Integration:** Checkpoint 3 PASS (adapter preserved; DTO-sourced values)

**Next:** Remove legacy adapter after full v1 renderer migration (PX6.1E)

---

### Quality — **PASS**

**Completed:** Backend projection tests; feature flag defaults; Sprint 18 contract tests retained.

**Blockers:** E2E owner-edit → OB reload requires seeded Firestore + running backend

**Integration:** Checkpoint 4 partial (unit); visual regression manual

---

### DevOps — **PASS**

**Completed:** `VITE_FF_OB_FIRESTORE`, `VITE_MARKETPLACE_API_PROXY` in `.env.example`; root `@bhojan/marketplace-contracts` dependency.

**Rollout:** OFF → Internal (local seed + flags) → Staging → Production

---

### Documentation — **PASS**

This report + schema reference in `src/domain/storefront/`.

---

## Local verification

```bash
# Terminal 1 — backend
npm run dev

# Terminal 2 — seed (requires Firebase credentials)
npx tsx scripts/seed-storefront-sprint19.ts demo-biryani-house

# Terminal 3 — OrderBhojan (MSW off, proxy to :8080)
cd orderbhojan
VITE_FF_OB_MENU=true VITE_FF_OB_RESTAURANT=true VITE_FF_OB_FIRESTORE=true npm run dev -- --port 5180
```

Open restaurant `demo-biryani-house` → menu shows Firestore owner copy (e.g. **₹50 off this weekend**).

---

## Source-of-Truth certification matrix

| Consumer value | DTO field | Firestore path | Owner surface |
|---|---|---|---|
| Price | `FoodDTO.pricing` | `menu/{id}.price` | Menu Editor |
| Offer text | `OfferDTO.displayText` | `menu/{id}.offer.displayText` | Menu Editor |
| Labels | `FoodDTO.labels` | `menu/{id}.labels[]` | Menu Editor |
| Gallery | `GalleryDTO` / experience | `tenants.marketplace.gallery[]` | Storefront API |
| Theme | `ThemeDTO` | `tenants.marketplace.theme` | Storefront API |
| Hours | experience `todayHours` | `tenants.marketplace.businessHours` | Storefront API |
| Featured IDs | `FoodMenuDTO.featuredFoodIds` | `tenants.marketplace.featuredFoodIds` | Storefront API |

---

## Stop conditions honored

No Checkout, Payments, Orders, Tracking, or UI redesign.

**Awaiting Sprint Review.**
