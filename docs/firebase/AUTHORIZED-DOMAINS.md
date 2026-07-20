# Firebase Authentication — Authorized Domains

All customer and operator apps use **one Auth tenant**: Firebase project **`bhojanos-prod`**.

Configure in [Firebase Console → Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/bhojanos-prod/authentication/settings).

## Required domains

| Domain | App | Hosting |
|--------|-----|---------|
| `localhost` | Local development | — |
| `bhojanos.com` | BhojanOS marketing + super-admin (Vercel) | Vercel custom domain |
| `www.bhojanos.com` | BhojanOS marketing + super-admin (Vercel) | Vercel custom domain |
| `orderbhojan.web.app` | OrderBhojan marketplace | Firebase project `orderbhojan` |
| `orderbhojan.firebaseapp.com` | OrderBhojan (alternate) | Firebase project `orderbhojan` |
| `orderbhojan.com` | OrderBhojan production | Custom domain on `orderbhojan` site |
| `www.orderbhojan.com` | OrderBhojan production | Custom domain on `orderbhojan` site |
| `manaintibojanam.web.app` | Founder storefront | `bhojanos-prod` site `manaintibojanam` |
| `manaintibojanam.firebaseapp.com` | Founder (alternate) | `bhojanos-prod` |
| `bhojanos-owner.web.app` | Owner portal | `bhojanos-prod` site `bhojanos-owner` |
| `bhojanos-admin.web.app` | Admin portal | `bhojanos-prod` site `bhojanos-admin` |

## Notes

- **`owner.web.app` / `admin.web.app`** are globally reserved by other Firebase projects and cannot be created on `bhojanos-prod`. Use `bhojanos-owner.web.app` / `bhojanos-admin.web.app`, or attach custom domains (e.g. `owner.bhojanos.com`) in Hosting settings.
- **Vercel** deployments (`*.vercel.app`, `www.bhojanos.com`, `bhojanos.com`) must stay authorized — super-admin login at `/super-admin/login` runs on the Vercel SPA.
- **No backend env changes** — `VITE_FIREBASE_PROJECT_ID=bhojanos-prod` stays the same for OrderBhojan; only hosting URLs change.
- If sign-in fails with `auth/network-request-failed` on `www.bhojanos.com`, also verify **GCP API key HTTP referrer restrictions** for the bhojanos-prod browser key include `https://www.bhojanos.com/*` and `https://bhojanos.com/*` (Console → Google Cloud → Credentials).

## Programmatic sync (repo script)

When you have Firebase Admin credentials locally or in CI:

```bash
# List missing domains (exit 1 if any missing)
npm run firebase:sync-auth-domains -- --check

# Preview changes
npm run firebase:sync-auth-domains -- --dry-run

# Apply missing domains to bhojanos-prod
npm run firebase:sync-auth-domains
```

## Manual Firebase Console steps

If the script cannot run (no service account):

1. Open [Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/bhojanos-prod/authentication/settings).
2. Click **Add domain** for each missing host from the table above (most common gap: `www.bhojanos.com`).
3. Open [Google Cloud → Credentials](https://console.cloud.google.com/apis/credentials?project=bhojanos-prod) → browser API key → **Application restrictions** → HTTP referrers → add:
   - `https://www.bhojanos.com/*`
   - `https://bhojanos.com/*`
   - `https://*.vercel.app/*` (if using preview deploys)
4. Hard-refresh the login page (Ctrl+Shift+R) and retry.

## Verification

After adding domains, test email/password sign-in from:

1. https://www.bhojanos.com/super-admin/login
2. https://orderbhojan.web.app
3. https://manaintibojanam.web.app
4. https://bhojanos-owner.web.app/owner/login
5. https://bhojanos-admin.web.app/admin/login

If sign-in fails with `auth/unauthorized-domain`, the domain is missing from the list above.
