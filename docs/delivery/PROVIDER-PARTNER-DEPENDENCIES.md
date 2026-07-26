# BhojanOS Delivery Provider — External Dependencies Report

Last updated: 2026-07-26

## Architecture summary

Multi-tenant delivery integrations store **public connection metadata** under:

`tenants/{tenantId}/deliveryProviderConnections/{provider}`

Encrypted credentials live server-only under:

`tenants/{tenantId}/deliveryProviderSecrets/{provider}`

Client/owner UI never receives ciphertext. Firestore rules deny client read/write on both subcollections. Owner APIs:

| Method | Path |
|--------|------|
| GET | `/api/owner/delivery-integrations/capabilities` |
| GET | `/api/owner/delivery-integrations/:tenantId` |
| POST | `.../:provider/start` |
| POST | `.../:provider/complete` |
| POST | `.../:provider/validate` |
| POST | `.../:provider/revoke` |
| POST | `.../dispatch` (orchestrated book + manual fallback) |

Manual OwnerOrders tracking-link dispatch remains the default proven path.

---

## Uber Direct

| Item | Detail |
|------|--------|
| Docs | https://developer.uber.com/docs/deliveries/get-started |
| Dashboard | https://direct.uber.com |
| Auth | OAuth2 `client_credentials`, scope `eats.deliveries` → `https://auth.uber.com/oauth/v2/token` |
| Quote | `POST https://api.uber.com/v1/customers/{customer_id}/delivery_quotes` |
| Create | `POST https://api.uber.com/v1/customers/{customer_id}/deliveries` |
| Merchant credentials | Customer ID, Client ID, Client Secret (per merchant Direct account) |
| Platform env | `UBER_DIRECT_LIVE=1` to enable live network calls; `DELIVERY_INTEGRATION_SECRET_KEY` (64-hex or passphrase) for AES-GCM |
| Status in BhojanOS | Adapter scaffold implemented; live booking gated |
| Remaining | Merchant Direct accounts, billing, webhook receiver URL registration, India availability confirmation per city |

---

## Porter

| Item | Detail |
|------|--------|
| Docs | **Gated / not publicly confirmed** — enterprise partner access required |
| Placeholder base | `PORTER_API_BASE_URL` (default `https://api.porter.in/v2`) |
| Credentials scaffold | `apiKey`, `merchantAccountId` |
| Platform env | `PORTER_LIVE=1` + partner-provisioned key |
| Status in BhojanOS | Connection + secret storage + blocked live booking until partner access |
| Remaining | Official OpenAPI/docs, sandbox, webhook auth scheme, SLA for trip status |

---

## Rapido

| Item | Detail |
|------|--------|
| Docs | **No clear public merchant delivery onboarding docs found** |
| Strategy | Manual tracking-link fallback only |
| Status in BhojanOS | Manual connection marker + `rapidoManualAdapter` |
| Remaining | Partner BD for API / hosted onboarding; keep manual dispatch until then |

---

## Self pickup

No external connection. Orchestrator returns manual self-pickup delivery data.

---

## Security checklist

- [x] No raw secrets on public `tenants/{id}` document
- [x] Secrets encrypted AES-256-GCM server-side
- [x] Firestore rules `allow read, write: if false` on secrets + connections
- [x] Connection audit collection `deliveryConnectionAudit`
- [x] Per-tenant revoke deletes secret doc
- [ ] Production: set `DELIVERY_INTEGRATION_SECRET_KEY` in Render/GCP Secret Manager (do not use dev fallback)

---

## Capability matrix (code source of truth)

See `backend-lib/delivery/providerCapabilityMatrix.ts`.
