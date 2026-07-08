# 10 — Future Compatibility Review

Domain design validation against future platform scenarios.

---

## Single kitchen ✓

| Requirement | Domain support |
|---|---|
| One location | `Branch` with `branchType: single_kitchen`, `defaultBranchId` |
| Shared menu | Products at restaurant level |
| Simple delivery | Single `DeliveryPolicy` |
| Owner UX | Branch UI hidden; defaults applied |

---

## Cloud kitchen ✓

| Requirement | Domain support |
|---|---|
| No dine-in | `fulfillmentModes: [delivery, pickup]` |
| Cloud badge | `listingBadges: [cloud_kitchen]` |
| Delivery-only gallery | `GalleryKind.packaging`, `kitchen` |
| Higher delivery radius | `DeliveryZone.maxRadiusKm` |

---

## Restaurant (dine-in + delivery) ✓

| Requirement | Domain support |
|---|---|
| Dine-in mode | `FulfillmentMode.dine_in` (future table booking external) |
| Ambience gallery | `GalleryKind.ambience`, `dining` |
| Dual hours | Same schedule; pickup/delivery windows via `CategorySchedule` (future) |

---

## Chain (multi-branch) ✓

| Requirement | Domain support |
|---|---|
| Multiple branches | `Restaurant.branches[]` |
| Branch-specific hours | `Branch.businessScheduleId` override |
| Branch-specific delivery | `Branch.deliveryPolicyId` override |
| Shared menu (default) | Products at restaurant level |
| Branch-specific availability | `ProductAvailability.branchAvailability` map |
| HQ user role | ACL on `Restaurant` aggregate |

**Future extension:** `menuScope: branch_specific` duplicates product refs per branch.

---

## Multi-branch menu variants (future)

Reserved fields:

- `FoodProduct.branchOverrides: Map<BranchId, BranchProductOverride>`
- `BranchProductOverride`: `{ pricing?, availability?, visibility? }`

Not in v1 implementation — schema reserved in domain doc.

---

## Franchise (future)

| Requirement | Domain support |
|---|---|
| Franchise unit type | `BusinessType.franchise_unit` |
| HQ → franchise menu templates | Future `MenuTemplate` aggregate (not in 6.1A) |
| Locked fields | `FieldLock` metadata on product (future) |
| Royalty / pricing floors | `pricing.minPrice` constraint (future) |

Domain does not block — `chain_hq` + `franchise_unit` types ready.

---

## Marketplace platform (multi-restaurant) ✓

| Requirement | Domain support |
|---|---|
| Discovery index | `discoveryTags`, `marketplaceStatus`, geo |
| Featured restaurants | Platform `featuredPriority` on restaurant |
| Search | `searchKeywords`, `seoTitle` on products |
| Collection rails | Platform-owned taxonomy references owner tags |

---

## Loyalty (future compatibility)

Reserved on `Offer`:

- `loyaltyCompatible: boolean`
- `OfferConditions.loyaltyTierRequired`
- `OfferConditions.pointsMultiplier`

Checkout loyalty domain separate. Marketplace offer pills unaffected until loyalty ships.

Renderer: no loyalty UI in PX6.1 scope.

---

## AI metadata (future)

Reserved on `FoodProduct`:

- `aiDescriptionDraft` — owner approval required before publish
- `aiPairingSuggestions` — surfaced only when `ownerApproved: true`
- `aiTags` — discovery boost optional

**Rule:** AI never writes directly to consumer DTO. Owner approves → domain → projection.

---

## Third-party delivery (future)

Reserved on `DeliveryPolicy`:

- `thirdPartyProviders: DeliveryProvider[]`
- `DeliveryProvider`: `{ id, name, enabled, externalStoreId }`

ETA/fee engine can delegate to provider quote API. Domain shape ready.

---

## Scheduled / pre-order (future)

| Feature | Domain support |
|---|---|
| Product preorder | `AvailabilityStatus.preorder` + `PreorderConfig` |
| Scheduled delivery | `DeliveryPolicy.scheduledDeliveryEnabled` |
| Category meal-time schedule | `CategorySchedule.mealTimes` |

---

## Internationalization (future)

- `Money.currency` on all pricing objects
- Renderer i18n for status labels — domain sends enum, not English string (except owner-authored `offer.text`, `label.text` which owner writes in locale)
- Multi-language menu: future `LocalizedString` map on name/description — not in v1

---

## Schema evolution strategy

| Mechanism | Use |
|---|---|
| Optional fields | All new fields optional with hide-if-empty render |
| `domainVersion` on documents | Migration scripts |
| DTO version header `X-DTO-Version: 2` | Client compat during transition |
| Deprecated bool badges | Shim until PX6.1G |

---

## Anti-future-proofing patterns avoided

| Pattern | Why avoided |
|---|---|
| Storing consumer English in domain enums | Owner owns copy via `text` fields |
| Embedding checkout logic in Offer | Separate coupon domain |
| Monolithic tenant document | Blocks chain/franchise |
| Renderer-side business rules | Prevents marketplace consistency |
| Global addon pool | Breaks product commerce model |

---

## Compatibility verdict

| Scenario | Ready | Notes |
|---|---|---|
| Single kitchen | ✅ | v1 default |
| Cloud kitchen | ✅ | |
| Restaurant dine-in | ✅ | dine_in flag reserved |
| Chain multi-branch | ✅ | Branch model included |
| Franchise | ⚠️ | Types reserved; template aggregate Phase 2 |
| Marketplace platform | ✅ | |
| Loyalty offers | ⚠️ | Fields reserved |
| AI merchandising | ⚠️ | Metadata reserved; approval gate required |
| Third-party delivery | ⚠️ | Provider slot reserved |
| i18n | ⚠️ | Currency ready; multi-locale Phase 2 |

---

## Domain freeze statement

This Product Domain (PX6.1A) is designed to support **single kitchen through chain** in v1 implementation, with **explicit extension points** for franchise, loyalty, AI, and third-party delivery without breaking aggregates.

**Status:** FROZEN pending approval.  
**Next phase:** PX6.1B Firestore Schema (implementation) — not started.
