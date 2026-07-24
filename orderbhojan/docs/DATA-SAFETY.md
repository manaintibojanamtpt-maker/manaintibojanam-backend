# OrderBhojan — Play Console Data Safety inventory (draft)

Use this as a worksheet when filling **Play Console → App content → Data safety**.  
Items marked **Play Console (manual)** must be declared in the console; this file is not submitted automatically.

App: `com.bhojanos.orderbhojan` (customer ordering).  
Last reviewed for Internal Testing readiness.

---

## Summary for Internal Testing

| Category | Collected? | Notes |
| --- | --- | --- |
| Account / auth identifiers | Yes | Google / phone OTP via Firebase Auth |
| Phone number | Yes | Sign-in OTP; may appear on orders / tracking |
| Location | Yes | Delivery address / device location for discovery |
| Payment info | Partial | Processed via Razorpay / UPI; app does not store full card numbers |
| Photos / media | No* | Profile photo URL from Google if user signs in with Google |
| Crash logs | Not integrated | No Firebase Crashlytics SDK in OrderBhojan at time of inventory |
| Analytics | Optional / not primary | No Firebase Analytics SDK wiring as a product analytics stack; search has local analytics helpers only |
| Approximate ads ID | No | No advertising SDK identified |

\*Profile image is a URL from the identity provider, not a camera upload flow.

---

## 1. Authentication data — **Play Console (manual)**

| Data type | Collected | Shared | Purpose | Ephemeral? |
| --- | --- | --- | --- | --- |
| Name | Yes (Google / profile) | With backend (Firebase / app servers) for account & orders | App functionality, account management | No |
| Email | Yes (Google) | Same | App functionality, account management | No |
| User IDs | Yes (Firebase UID) | Same | App functionality | No |
| Phone number | Yes (OTP sign-in) | Same | App functionality, account management | No |

**Providers:** Firebase Authentication (Google Sign-In, Phone OTP).  
**In-app disclosure:** Privacy policy link under Profile.

---

## 2. Phone number / OTP — **Play Console (manual)**

| Usage | Details |
| --- | --- |
| Sign-in | Firebase Phone Auth sends OTP; phone may be stored on the user account |
| Orders / tracking | Phone may be used for guest order lookup or kitchen contact flows |
| SMS | OTP delivery via Firebase / carrier; not an in-app SMS reader |

Declare **Phone number** under Personal info if required by the form.

---

## 3. Location data — **Play Console (manual)**

| Type | Collected | Purpose |
| --- | --- | --- |
| Approximate / precise location | Yes (when user grants permission or picks address) | Delivery zone, restaurant discovery, saved addresses |
| Address | Yes (user-entered / saved) | Order delivery |

Declare location collection and whether it is approximate and/or precise per Play form options.  
Not used for advertising in this inventory.

---

## 4. Payment-related data flow — **Play Console (manual)**

| Flow | What the app handles | What third parties handle |
| --- | --- | --- |
| Razorpay | Initiates checkout session; receives payment success/failure confirmation | Card / UPI / wallet PAN and processing |
| UPI deep links | Opens UPI apps; may store payment reference for verification | UPI apps / banks |
| COD | Order metadata only | N/A |

**Typically declare:** Purchase history / order info as collected for app functionality.  
**Typically do not claim** that the app collects full credit card numbers if only Razorpay collects them — follow Play’s “processed by payment processor” guidance when filling the form.

---

## 5. Analytics / crash data

| Type | Present in OrderBhojan? | Play declaration |
| --- | --- | --- |
| Firebase Crashlytics | **No** (not integrated) | Do not declare crash logs unless added later |
| Firebase Analytics / GA | **Not as a primary SDK path** (`measurementId` may exist in config; confirm before production form) | If Measurement ID is active and events fire, declare Analytics; otherwise mark as not collected |
| Push (FCM) | **Yes** — Capacitor Push Notifications + Firebase Messaging token registration | Declare **Device or other IDs** / push tokens as collected for app functionality if tokens are stored server-side |

Re-check before production release if Crashlytics/Analytics are added.

---

## 6. Other common Play categories

| Category | Status |
| --- | --- |
| Contacts | Not collected for OrderBhojan customer flows |
| Calendar | Not collected |
| SMS / call log | Not collected (OTP is via Firebase, not local SMS inbox) |
| Files / docs | Not collected as a product feature |
| Web browsing history | N/A |
| App activity / search | In-app search may be logged locally or to backend for discovery — treat as App activity if server-side search analytics exist |

---

## Privacy policy URL (for Play Console + in-app)

- **In-app / code:** `orderbhojan/src/config/legalUrls.ts` → `PRIVACY_POLICY_URL`
- **Default hosted page:** `https://www.bhojanos.com/privacy`
- **Play Console:** App content → Privacy policy → paste the same live URL

---

## Manual Play Console checklist

- [ ] Data safety form completed using this inventory
- [ ] Privacy policy URL pasted and publicly reachable
- [ ] Declare encryption in transit (HTTPS / Firebase) as applicable
- [ ] Declare account deletion / data deletion policy if/when required for production (not blocking for pure Internal Testing in all cases — confirm current Play requirements)
