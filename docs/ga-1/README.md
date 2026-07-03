# GA-1 — Legacy Production Deployment

**Program:** BhojanOS SaaS · Production Deployment GA-1  
**Status:** Active runbook  
**Architecture:** Legacy read path only — projection infrastructure dormant

---

## Documents

| Document | Purpose |
|----------|---------|
| [GA-1-LEGACY-PRODUCTION-DEPLOYMENT.md](./GA-1-LEGACY-PRODUCTION-DEPLOYMENT.md) | Primary deployment runbook |
| [PRODUCTION-FLAG-MANIFEST.md](./PRODUCTION-FLAG-MANIFEST.md) | Flags that must remain OFF |
| [QUALITY-GATES.md](./QUALITY-GATES.md) | Pre/post deploy verification |
| [ROLLBACK.md](./ROLLBACK.md) | L1–L4 rollback procedures |
| [GA-1-DEPLOYMENT-REPORT.md](./GA-1-DEPLOYMENT-REPORT.md) | Deployment completion report |

---

## Quick commands

```bash
# Verify projection flags OFF (local env)
npm run verify:ga1-flags

# Full pre-deploy gate (tests + build:web + build:server)
npm run gate:ga1

# Post-deploy health
curl -s https://manaintibojanam-backend.onrender.com/api/health
curl -s https://www.bhojanos.com/version.json
```

---

## Architecture

```
Customer → React (Vercel) → API (Render) → Legacy SDKs → Firestore
```

**No projection · No adapter · No rollout · No certification · No runtime switching**

---

## STOP

Do **not** enable projection architecture until explicit ARB approval after real production usage validation.
