# GA-2 Owner Onboarding Checklist

**Use this checklist when onboarding the first production restaurant.**

---

## Registration & Account

- [ ] Owner registers at `/owner/register` (email or Google)
- [ ] Tenant provisioned (`POST /api/owner/provision`)
- [ ] Owner lands on `/owner/dashboard`
- [ ] Store setup guide visible when incomplete

---

## Setup Wizard (`/owner/setup`)

| Step | Field | Verified |
|------|-------|----------|
| 1 Account | Email confirmed | ☐ |
| 2 Kitchen | Restaurant name | ☐ |
| 3 Location | Full address / structured India address | ☐ |
| 4 Delivery | Free radius + max radius (km) | ☐ |
| 5 Payments | COD and/or Razorpay enabled | ☐ |
| 6 Menu | ≥ 3 menu items with prices | ☐ |
| 7 Go live | Store published, Growth trial started | ☐ |

---

## Post-Wizard Configuration

| Item | Path | Verified |
|------|------|----------|
| Operating hours | `/owner/settings?tab=hours` | ☐ |
| GST / packaging charges | `/owner/settings` → Location | ☐ |
| Delivery fees | `/owner/settings` → Delivery | ☐ |
| Logo & WhatsApp | `/owner/settings` → General | ☐ |
| QR ordering | Storefront URL shared | ☐ |

---

## Compliance (KYC)

| Item | Path | Verified |
|------|------|----------|
| Merchant declaration | `/owner/kyc` | ☐ |
| Business identity (name, address, phone) | `/owner/kyc` | ☐ |
| GST number | `/owner/kyc` | ☐ |
| PAN number | `/owner/kyc` | ☐ |
| Bank account holder, number, IFSC, bank name | `/owner/kyc` | ☐ |
| Identity + business documents uploaded | `/owner/kyc` | ☐ |

---

## Customer Flow Verification

- [ ] Storefront loads at `https://www.bhojanos.com/k/{slug}`
- [ ] Menu loads with images and prices
- [ ] Cart add/remove works
- [ ] Checkout completes (COD test order)
- [ ] Razorpay test payment (if enabled)
- [ ] Order appears in `/owner/orders`
- [ ] Owner dashboard shows today's revenue and pending count
- [ ] Customer tracks order at `/order/{orderId}` **without login**
- [ ] Status notification delivered (FCM / WhatsApp / email)

---

## Tenant Isolation

- [ ] Owner A cannot read Owner B's orders
- [ ] Owner A cannot read Owner B's menu
- [ ] Firestore rules deny cross-tenant access

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Owner | | |
| BhojanOS ops | | |
