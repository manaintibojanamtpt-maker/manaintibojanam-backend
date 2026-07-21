# Manual trust-path validation (OrderBhojan)

Baseline commit: `f63c8ee` (home crash fix). Use this checklist when verifying scenarios **2–7** on a physical Android device or production web.

## Enable debug mode

Debug instrumentation is **off by default in production**. Enable one of:

| Method | How |
|--------|-----|
| URL | Open `https://orderbhojan.web.app/?debug=1` (persists to storage on first load) |
| Storage | In DevTools / WebView console: `localStorage.ob_debug = '1'` then reload |
| Programmatic | `window.__OB_DEBUG__ = true` then reload |

On Android APK: Chrome remote debugging → Application → Local Storage → `ob_debug=1`, or launch with `?debug=1` if your deep link supports it.

When enabled you get:

- Grouped `console.debug` lines prefixed `[OB debug:…]`
- Optional bottom **OB trust debug** strip (tap to expand)

Disable: `localStorage.removeItem('ob_debug')` and reload without `?debug=1`.

## Scenarios 2–7

| # | Scenario | Steps | Pass criteria |
|---|----------|-------|---------------|
| **2** | Far-away, no location | Disable GPS / deny location. Do **not** set delivery address. Open home. | Empty feed or **Set your location** prompt. **Zero** kitchens. Debug: `isConfirmed=false` or no coords; `kitchens=0`. |
| **3** | Selected delivery address | Location sheet → pick saved/manual address for parents/friends (not current GPS). | Header shows selected label; kitchens only near **those** lat/lng (≤18 km). Debug: `mode=selected`, coords match chosen pin. |
| **4** | Cart → checkout | Add items → cart → checkout with confirmed location. | Checkout loads bill without “address required”. Debug: same coords as discovery; `checkout` total present. |
| **5** | Razorpay amount exact | Checkout total **₹400** (0% GST tenant) → Pay online. | Razorpay sheet shows **₹400.00**, not ₹420. Debug: `checkout=400`, `razorpay=40000` paise before create-order. |
| **6** | Google auth return | From checkout, trigger sign-in → Continue with Google → complete OAuth. | Lands back on **checkout** (or stored `returnTo`), not stuck on `/auth`. Debug: `returnTo=/checkout…` on redirect/resume. |
| **7** | Shell trust | Home, cart, checkout, location sheet. | No duplicate headers; no double top padding; bottom sheet clears gesture bar; location sheet does **not** auto-open on home load. |

Scenario **1** (home launches without React #301) is already verified on baseline `f63c8ee`.

## Debug logs to watch

Filter logcat / console for `[OB debug:`.

| Scope | When | Key fields |
|-------|------|------------|
| `location` | `resolveActiveDeliveryLocation` | `mode`, `lat`, `lng`, `isConfirmed`, `source` |
| `discovery` | Home feed fetch/render | `enabled`, `hasConfirmedCoords`, coords, `shownKitchens`, `excludedKitchens` (if API provides) |
| `checkout` | Razorpay place order | `quote.grandTotal`, `expectedPaise`, `placeAmountPaise` |
| `razorpay` | Before `/api/create-razorpay-order` | `draftId`, `amountPaise`, `quoteGrandTotal` |
| `auth` | Persist / resume return target | `returnTo`, `source` (`sessionStorage` / `query`), `action` |

Global snapshot (console): `window.__OB_TRUST_DEBUG__`

## If a scenario fails

Report:

1. Scenario number  
2. Screenshot + `[OB debug:…]` log excerpt  
3. `window.__OB_TRUST_DEBUG__` JSON  

Priority for fixes: wrong kitchens → wrong Razorpay amount → auth return → shell/checkout UX.
