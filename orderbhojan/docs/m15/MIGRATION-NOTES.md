# M1.5 Migration Notes

## From M1 (0.3.0-m1) → M1.5 (0.3.5-m15)

### What Changed

| Area | Change |
|------|--------|
| Home (`/`) | Replaced M0 developer dashboard with marketplace experience shell |
| `/search`, `/cart`, `/orders` | New BDS UI pages (mock data only) |
| `/profile` | Premium profile placeholder; accessible to guests |
| `MarketplaceLayout` | Consumer bottom navigation (5 tabs) |
| `src/features/experience/` | New module for shell UI, mock catalog, Zustand preview stores |
| `src/styles/experience-shell.css` | Layout and motion tokens (BDS variables only) |

### Unchanged

- M1 Authentication (Google, Phone OTP, Guest, Firestore bootstrap)
- Marketplace API client (not used by experience shell)
- Feature flags (all OFF by default)
- `/foundation` dev status page (hidden from consumer nav)

### No New Environment Variables

### Verification

```bash
cd orderbhojan
npm run gate:m15
npm run dev   # http://localhost:5174
```

### Rollback

Revert to tag `0.3.0-m1`. Home returns to M0 dashboard layout.

### Do Not Enable Yet

- Discovery, Location, Restaurant APIs, Search logic, Cart checkout, Payments, Orders backend
