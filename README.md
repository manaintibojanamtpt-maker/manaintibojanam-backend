<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# BhojanOS Platform

Monorepo for the BhojanOS unified marketplace platform: Founder Store, OrderBhojan, owner/admin surfaces, shared design system, and backend services.

---

## Engineering governance

Official engineering standards for all contributors, reviewers, and AI agents:

| Document | Description |
|----------|-------------|
| [ARCHITECTURE_FREEZE_v1.md](./ARCHITECTURE_FREEZE_v1.md) | Constitutional architecture — single design system, logic isolation |
| [MIGRATION_GOVERNANCE.md](./MIGRATION_GOVERNANCE.md) | Migration release gates, deliverables, definition of done |
| [ENGINEERING_PLAYBOOK.md](./ENGINEERING_PLAYBOOK.md) | **Engineering handbook** — how BhojanOS engineering operates |
| [docs/design-system-migration/EXCEPTIONS.md](./docs/design-system-migration/EXCEPTIONS.md) | CI-approved governance exceptions |
| [docs/design-system-migration/RELEASE_READINESS_DASHBOARD.md](./docs/design-system-migration/RELEASE_READINESS_DASHBOARD.md) | Migration progress and quality gates |

**Validators (run before merge):**

```bash
npm run validate:architecture
npm run validate:design-system
npm run validate:release-dashboard   # after milestone completion
```

---

## Run locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app: `npm run dev`

**OrderBhojan (customer app):**

```bash
cd orderbhojan
npm install
npm run dev
```

View in AI Studio: https://ai.studio/apps/db2c53da-c88f-4664-a073-023122c63f7b

---

## API note (orders)

- The production SPA creates orders by writing directly to Firestore via `src/services/api.ts#createOrder`.
- `POST /api/orders` remains available for backward compatibility only and returns `deprecated: true`.
