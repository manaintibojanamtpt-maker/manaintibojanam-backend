# 03 — Versioning Strategy

Every DTO is versioned. Evolution is additive by default.

---

## Version format

```
schemaVersion: "MAJOR.MINOR"
```

| Component | Meaning |
|---|---|
| **MAJOR** | Breaking change — requires client migration |
| **MINOR** | Additive — backward compatible |

Initial release: **`"1.0"`** for all contracts.

---

## Versioned contracts (v1.0 baseline)

| Contract | v1.0 ID |
|---|---|
| RestaurantDTO | `RestaurantDTO/1.0` |
| RestaurantExperienceDTO | `RestaurantExperienceDTO/1.0` |
| FoodDTO | `FoodDTO/1.0` |
| FoodMenuDTO | `FoodMenuDTO/1.0` |
| CategoryDTO | `CategoryDTO/1.0` |
| OfferDTO | `OfferDTO/1.0` |
| VariantDTO | `VariantDTO/1.0` |
| AddonGroupDTO | `AddonGroupDTO/1.0` |
| AddonOptionDTO | `AddonOptionDTO/1.0` |
| ThemeDTO | `ThemeDTO/1.0` |
| GalleryDTO | `GalleryDTO/1.0` |
| ImageDTO | `ImageDTO/1.0` |
| MoneyDTO | `MoneyDTO/1.0` |
| MarketplaceErrorDTO | `MarketplaceErrorDTO/1.0` |

---

## HTTP / API versioning

| Mechanism | Usage |
|---|---|
| `Accept: application/vnd.orderbhojan.marketplace+json; version=1` | Preferred |
| `X-Contract-Version: 1.0` response header | Always present |
| `meta.dtoVersions[]` in response envelope | Lists DTO versions in payload |
| URL `/v1/restaurants/...` | Path version — locked for v1 lifetime |

Clients must read `schemaVersion` on each DTO root and nested DTO they consume.

---

## MINOR version (1.0 → 1.1) — allowed changes

- Add optional fields with documented defaults
- Add new enum values at end of union (clients ignore unknown enum via fallback)
- Add new DTO types in envelope arrays
- Relax validation (wider constraints) with caution

**Client rule:** Unknown fields → ignore (see Compatibility Guide).

---

## MAJOR version (1.x → 2.0) — breaking changes

Requires new contract namespace and parallel support period:

| Breaking change | Example |
|---|---|
| Remove field | Drop `subtitle` |
| Rename field | `displayText` → `headline` |
| Change type | `amount: number` → `amountMinor: integer` |
| Change semantics | `priceDelta` → always absolute |
| Tighten required | Make `theme.logo` required |

**Process:**
1. Publish `FoodDTO/2.0` spec
2. Mapper emits v2 on new endpoint or `Accept` header
3. v1 mapper maintained minimum **6 months**
4. Deprecation notice in `meta.deprecations[]`

---

## Nested DTO versioning

Nested objects carry their own `schemaVersion`:

```json
{
  "schemaVersion": "1.0",
  "displayName": "Mana Inti Kitchen",
  "theme": {
    "schemaVersion": "1.0",
    "logo": { "schemaVersion": "1.0", "url": "..." }
  }
}
```

If `ThemeDTO` bumps to 2.0 while `RestaurantDTO` stays 1.0:
- `RestaurantDTO/1.1` may embed `ThemeDTO/2.0` — document in changelog
- Clients read nested `schemaVersion` independently

---

## Example future evolution

### RestaurantDTO v2.0 (hypothetical)

- Add `branches: BranchSummaryDTO[]` for multi-location picker
- Remove `galleryPreview` — moved to dedicated endpoint
- **Breaking** — v1 clients continue via `/v1/` + v1 mapper

### FoodDTO v2.0 (hypothetical)

- Replace `labels: LabelDTO[]` with `merchandising: MerchandisingDTO`
- Add `localizedNames: Record<locale, string>`
- v1 shim: map `merchandising.badges` → v1 `labels[]` in compat mapper

### OfferDTO v1.1 (hypothetical, non-breaking)

- Add optional `iconKind?: string` for renderer icon hints

---

## Deprecation policy

| Stage | Duration | Action |
|---|---|---|
| **Announced** | T+0 | Field marked `@deprecated` in spec; still populated |
| **Sunset** | T+6mo | Field omitted from v(N+1) MAJOR |
| **Removed** | T+12mo | v(N) mapper discontinued |

Deprecation entries:

```typescript
interface DeprecationNoticeDTO {
  readonly schemaVersion: '1.0';
  readonly field: string;
  readonly dtoVersion: string;
  readonly replacement?: string;
  readonly sunsetDate: string;
}
```

---

## Contract registry (future tooling)

Maintain machine-readable registry at `contracts/marketplace/v1/` (PX6.1D):

```
restaurant.dto.json
food.dto.json
...
```

JSON Schema generated from this spec — **not** implemented in PX6.1A.5.

---

## Version compatibility matrix

| Client | Server | Result |
|---|---|---|
| v1 client | v1 API | ✅ Full |
| v1 client | v2 API (default v2) | ❌ Use `/v1/` or Accept v1 |
| v2 client | v1 API | ⚠️ Missing fields — graceful degrade |
| v2 client | v2 API | ✅ Full |

---

*Version numbers are promises. Breaking them requires a MAJOR bump and migration plan.*
