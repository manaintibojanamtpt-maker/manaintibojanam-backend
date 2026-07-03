# GA-3 — Production Billing & Checkout Synchronization Hotfix

## Root Cause Analysis

### Observed mismatch (production)

| Setting | Owner Storefront | Checkout (before fix) |
|---------|------------------|------------------------|
| Base delivery fee | ₹20 | ₹30 |
| Per KM | ₹0 | — |
| GST | 0% | 5% (~₹12.45 on ₹249) |
| Packaging | ₹0 | ₹10 (bundled in “Taxes”) |

Checkout total: Item ₹249 + Delivery ₹30 + Taxes ₹22 = **₹301** — inconsistent with owner config.

### Evidence — where values came from

1. **GST 5% + Packaging ₹10** — `resolveTenantPricing()` in `src/lib/tenantCheckoutConfig.ts` treated `mana-inti` (and any tenant without detected storefront config) as legacy and returned `globalFees.gst ?? 5`, `globalFees.packingFee ?? 10`, **ignoring** Firestore `pricingConfig` even when the owner had saved GST=0 and Packaging=0.

2. **Delivery ₹30** — Three compounding paths:
   - Checkout used `pricing.baseDeliveryFee` or stale `selectedAddress.deliveryFee` **without requiring coordinates** (`useCheckoutState.ts` lines 165–171).
   - `computeDeliveryFee()` in `src/lib/deliveryFee.ts` applied `DEFAULT_BASE_DELIVERY_FEE = 30` when zones existed but `feesConfigured` was false, even when owner had set `baseFee: 20`.
   - Legacy global fallback `deliveryFee ?? 30` in `resolveTenantPricing`.

3. **Premature delivery calculation** — Checkout charged delivery when `feesConfigured` was true but no valid lat/lng existed on the selected address.

4. **Static bill label** — UI hard-coded “GST (5%) + Packaging” logic inline instead of deriving from resolved pricing.

## Architecture Impact

**None on frozen platform layers.**

| Layer | Modified |
|-------|----------|
| React checkout / billing UI | Yes |
| Legacy pricing loader (`tenantCheckoutConfig`) | Yes |
| Delivery calculator (`deliveryFee.ts`) | Yes |
| M1–M8 SDKs, DTOs, repositories | No |
| Firestore schema | No |
| Feature flags / projection | No |
| Server API | No |

Architecture preserved:

```
Customer → React → Legacy API → Legacy SDKs → Firestore
```

## Files Modified

| File | Change |
|------|--------|
| `src/lib/tenantCheckoutConfig.ts` | Owner config as SSOT; legacy fallback only when config absent; delivery/tax helpers |
| `src/lib/deliveryFee.ts` | Honor `feesConfigured`; no ₹30 when owner set explicit fees |
| `src/hooks/useCheckoutState.ts` | Recalculate delivery from live tenant + coordinates; no stale cached fees |
| `src/lib/useDeliveryState.ts` | Reject 0,0 coordinates in persisted state |
| `src/pages/Checkout.tsx` | Dynamic tax labels; “Calculated after address selection” for delivery |
| `src/lib/__tests__/tenantCheckoutConfig.test.ts` | Regression tests |
| `package.json` | Wire GA-3 tests into `test:unit` |

## Calculation Flow — Before

```
Firestore tenant doc
        ↓ (ignored for mana-inti / incomplete detection)
adminSettings/global OR hardcoded defaults (GST 5%, pack ₹10, delivery ₹30)
        ↓
useCheckoutState: address.deliveryFee OR baseDeliveryFee (no coords required)
        ↓
Checkout UI: static “GST (5%) + Packaging”
```

## Calculation Flow — After

```
Firestore tenant doc (pricingConfig + deliveryConfig)
        ↓
resolveTenantPricing() — owner config first; legacy global ONLY if config missing
        ↓
resolveCheckoutDeliveryFee() — requires valid lat/lng; computeDeliveryFee(dist, deliveryConfig)
        ↓
GST / packaging from pricingConfig only (0 when configured 0)
        ↓
Checkout UI: dynamic labels via formatTaxAndChargesLabel(); delivery pending until address
```

## Regression Tests

Run:

```bash
npm run test:unit
```

Coverage in `src/lib/__tests__/tenantCheckoutConfig.test.ts`:

- GST: 0, 5, 12, 18
- Packaging: 0, 10, 25
- Delivery: base fee, per-km beyond radius, max radius boundary, no location, location selected
- Bill summary arithmetic
- Owner config overrides legacy global fees for `mana-inti`
- Legacy fallback when tenant config absent

## Performance Impact

- **No additional Firestore reads** — reuses existing `liveTenant` snapshot from checkout hook.
- **No new network calls** — distance/fee computed client-side from already-loaded `deliveryConfig`.
- Delivery fee recalculated in existing `useMemo` when address or tenant config changes.

## Backward Compatibility

| Scenario | Behavior |
|----------|----------|
| Owner configured GST/packaging/delivery | Exact owner values used |
| Legacy `mana-inti` without storefront config | Falls back to `adminSettings/global` (GST 5%, pack ₹10, delivery ₹30) |
| New tenant with no config | Zeros / no delivery until configured |
| Zones without fees (incomplete legacy) | Platform default ₹30 tier (unchanged) |
| `packagingFee` field alias | Supported for older documents |

## Production Validation Checklist

- [ ] Owner sets GST → checkout reflects immediately (live tenant snapshot)
- [ ] Owner sets packaging → checkout reflects immediately
- [ ] Owner sets base fee ₹20, per KM ₹0 → checkout shows ₹20 after address selection
- [ ] No address / no coordinates → delivery shows “Calculated after address selection”, fee ₹0 in total
- [ ] Customer selects address → delivery recalculated from kitchen distance
- [ ] GST=0, packaging=0 → no taxes line; grand total = item total + delivery only

## Confirmation

- ✓ Legacy architecture preserved
- ✓ No M1–M8 frozen platform modified
- ✓ No SDK contract changes
- ✓ No Firestore schema changes
- ✓ No feature flag changes
- ✓ Production compatible hotfix scope only
