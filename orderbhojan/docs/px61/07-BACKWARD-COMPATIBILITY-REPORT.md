# PX6.1 — Backward Compatibility Report

**Audit phase baseline** — pre-migration behavior documented for safe rollout.

---

## Feature flags (unchanged)

| Flag | Current default | PX6.1 impact |
|---|---|---|
| `FF_OB_HOME` | OFF | Home mock path preserved until Firestore discovery |
| `FF_OB_RESTAURANT` | OFF | Restaurant MSW preserved until Firestore restaurant |
| `FF_OB_MENU` | OFF | Menu MSW preserved until Firestore menu |
| `FF_OB_SEARCH` | OFF | Search MSW preserved until search index |

New flags (`FF_OB_FIRESTORE_*`) default OFF — zero breaking change at deploy.

---

## DTO backward compatibility strategy

### FoodPublic boolean badges → labels[]

During migration, projection layer emits **both**:

```typescript
// Projection shim (temporary)
labels: menu.labels ?? inferLabelsFromLegacy(menu),
bestSeller: menu.labels?.includes('BESTSELLER') ?? menu.isBestSeller,
chefSpecial: menu.labels?.includes('CHEF_PICK') ?? menu.isBestSeller,
```

Renderer migrates to `labels[]` first; booleans removed in Phase 4.

### offerPrice without offer.text

If owner sets `sellingPrice` but no `offer.text`:

- **Do NOT** compute `% OFF`
- **Fallback:** show strike-through price only, or hide offer badge
- **Log:** `[px61] offer enabled but text missing for foodId=...`

### Missing optional fields

| Missing field | Consumer behavior | Log level |
|---|---|---|
| `gallery[]` | Hide gallery section | warn |
| `offers[]` | Hide offer pills | — |
| `featuredIds[]` | Hide signature rail | warn |
| `preparationTime` | Hide prep badge | — |
| `rating` | Hide rating | — |
| `variants[]` | Direct add (no sheet) | — |
| `addons[]` | Hide addons section | — |
| `images[]` | Placeholder surface color (no Unsplash) | warn |
| `description` | Hide description line | — |
| `categoryId` | Group by category name string | warn |

**Never crash.** Empty sections preferred over fabricated content.

### Restaurant slug unknown

If slug not in Firestore:

- Return `404` / `PremiumEmpty` "Menu unavailable"
- **Do NOT** fall back to `demo-biryani-house` menu (current mock behavior at line 211)

---

## MSW coexistence

| Mode | When | Data source |
|---|---|---|
| Legacy dev | Flags OFF, Firestore flags OFF | MSW mocks (current) |
| Transitional | Firestore flags ON, per-endpoint | Firestore for enabled endpoints, MSW for others |
| Target | All Firestore flags ON | Firestore only; MSW test-only |

---

## Owner portal compatibility

| Change | Impact on existing owners |
|---|---|
| Extended menu fields | Old items remain valid; new fields optional |
| Category documents | Migrate string `category` → `categoryId` via one-time script |
| New marketplace tab | Empty until owner configures — OB shows minimal profile |
| Coupons unchanged | Checkout coupons unaffected |

---

## API client compatibility

`MarketplaceHttpClient` and OpenAPI spec unchanged at wire level.  
New optional DTO fields are additive.  
Removed fabrication in UI does not change API contract.

---

## Rollback plan

1. Set `FF_OB_FIRESTORE_*` → `false`
2. MSW handlers resume immediately (no deploy rollback needed)
3. Owner data in Firestore preserved — no data loss
