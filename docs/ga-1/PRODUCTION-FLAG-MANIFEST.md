# GA-1 Production Flag Manifest

**Status:** Enforced for legacy production deployment  
**Manifest file:** `scripts/flags/ga1-production-flags.json`  
**Verification:** `npm run verify:ga1-flags`

---

## Rule

All **forbidden projection flags** must be **OFF** or **unset** in Vercel Production and Render environments. Unset defaults to OFF in SDK code.

Core SDK flags (e.g. `FF_MENU_ENABLED`, `FF_PRICING_ENABLED`) may be enabled for legacy Firestore functionality. Projection infrastructure must remain dormant.

---

## Forbidden — Event Platform (M6)

| Flag | Env key | Required |
|------|---------|----------|
| `FF_EVENT_PLATFORM_ENABLED` | `VITE_FF_EVENT_PLATFORM_ENABLED` | OFF |
| `FF_EVENT_OUTBOX_ENABLED` | `VITE_FF_EVENT_OUTBOX_ENABLED` | OFF |
| `FF_EVENT_REPLAY_ENABLED` | `VITE_FF_EVENT_REPLAY_ENABLED` | OFF |
| `FF_EVENT_SHADOW_PUBLISHING_ENABLED` | `VITE_FF_EVENT_SHADOW_PUBLISHING_ENABLED` | OFF |
| `FF_EVENT_PROJECTION_ENABLED` | `VITE_FF_EVENT_PROJECTION_ENABLED` | OFF |
| `FF_EVENT_PROJECTION_RUNTIME_ENABLED` | `VITE_FF_EVENT_PROJECTION_RUNTIME_ENABLED` | OFF |
| `FF_EVENT_OPERATIONAL_VALIDATION_ENABLED` | `VITE_FF_EVENT_OPERATIONAL_VALIDATION_ENABLED` | OFF |

---

## Forbidden — Order Projection (M6)

| Flag | Env key | Required |
|------|---------|----------|
| `FF_ORDER_SHADOW_EVENTS_ENABLED` | `VITE_FF_ORDER_SHADOW_EVENTS_ENABLED` | OFF |
| `FF_ORDER_READ_PROJECTION_ENABLED` | `VITE_FF_ORDER_READ_PROJECTION_ENABLED` | OFF |
| `FF_ORDER_PROJECTION_PARITY_ENABLED` | `VITE_FF_ORDER_PROJECTION_PARITY_ENABLED` | OFF |
| `FF_ORDER_PROJECTION_SOAK_ENABLED` | `VITE_FF_ORDER_PROJECTION_SOAK_ENABLED` | OFF |
| `FF_ORDER_PROJECTION_ADAPTER_ENABLED` | `VITE_FF_ORDER_PROJECTION_ADAPTER_ENABLED` | OFF |
| `FF_ORDER_PROJECTION_ROLLOUT_ENABLED` | `VITE_FF_ORDER_PROJECTION_ROLLOUT_ENABLED` | OFF |
| `FF_ORDER_PROJECTION_CERTIFICATION_ENABLED` | `VITE_FF_ORDER_PROJECTION_CERTIFICATION_ENABLED` | OFF |

---

## Forbidden — Menu Projection (M7)

| Flag | Env key | Required |
|------|---------|----------|
| `FF_MENU_PROJECTION_ENABLED` | `VITE_FF_MENU_PROJECTION_ENABLED` | OFF |
| `FF_MENU_PROJECTION_PARITY_ENABLED` | `VITE_FF_MENU_PROJECTION_PARITY_ENABLED` | OFF |
| `FF_MENU_PROJECTION_SOAK_ENABLED` | `VITE_FF_MENU_PROJECTION_SOAK_ENABLED` | OFF |
| `FF_MENU_OPERATIONAL_VALIDATION_ENABLED` | `VITE_FF_MENU_OPERATIONAL_VALIDATION_ENABLED` | OFF |
| `FF_MENU_PROJECTION_ADAPTER_ENABLED` | `VITE_FF_MENU_PROJECTION_ADAPTER_ENABLED` | OFF |
| `FF_MENU_PROJECTION_ROLLOUT_ENABLED` | `VITE_FF_MENU_PROJECTION_ROLLOUT_ENABLED` | OFF |
| `FF_MENU_PROJECTION_CERTIFICATION_ENABLED` | `VITE_FF_MENU_PROJECTION_CERTIFICATION_ENABLED` | OFF |

---

## Forbidden — Pricing Projection (M8)

| Flag | Env key | Required |
|------|---------|----------|
| `FF_PRICING_PROJECTION_ENABLED` | `VITE_FF_PRICING_PROJECTION_ENABLED` | OFF |
| `FF_PRICING_PROJECTION_PARITY_ENABLED` | `VITE_FF_PRICING_PROJECTION_PARITY_ENABLED` | OFF |
| `FF_PRICING_PROJECTION_SOAK_ENABLED` | `VITE_FF_PRICING_PROJECTION_SOAK_ENABLED` | OFF |
| `FF_PRICING_OPERATIONAL_VALIDATION_ENABLED` | `VITE_FF_PRICING_OPERATIONAL_VALIDATION_ENABLED` | OFF |
| `FF_PRICING_PROJECTION_ADAPTER_ENABLED` | `VITE_FF_PRICING_PROJECTION_ADAPTER_ENABLED` | OFF |
| `FF_PRICING_PROJECTION_ROLLOUT_ENABLED` | `VITE_FF_PRICING_PROJECTION_ROLLOUT_ENABLED` | OFF |
| `FF_PRICING_PROJECTION_CERTIFICATION_ENABLED` | `VITE_FF_PRICING_PROJECTION_CERTIFICATION_ENABLED` | OFF |

**Total forbidden projection flags: 28**

---

## Allowed — Legacy SDK path

These flags control legacy Firestore reads and may be enabled for production functionality:

| Flag | Purpose |
|------|---------|
| `FF_MENU_ENABLED` | Menu SDK via legacy repository |
| `FF_PRICING_ENABLED` | Pricing SDK via legacy repository |
| `FF_DISCOVERY_ENABLED` | Discovery marketplace |
| `FF_SEARCH_ENABLED` | Search |
| `FF_LOCATION_*` | Location services |

Do **not** conflate enabling core SDK flags with enabling projection infrastructure.

---

## Verification

```bash
# Against current shell environment
npm run verify:ga1-flags

# Against a specific env file (e.g. exported from Vercel)
node scripts/ga1/verify-production-legacy-flags.mjs --env-file .env.production
```

---

## Emergency disable

If any projection flag is accidentally enabled:

1. Remove or set `false` in Vercel Production env
2. Redeploy frontend (`git push` or Vercel redeploy)
3. Re-run `npm run verify:ga1-flags`
4. See [ROLLBACK.md](./ROLLBACK.md) L1
