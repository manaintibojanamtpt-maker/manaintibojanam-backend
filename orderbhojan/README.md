# OrderBhojan

Production marketplace customer platform for India.

**Milestone:** M0 Foundation  
**Backend:** BhojanOS Marketplace API (consumer only)  
**Customer Firebase:** `orderbhojan`

## Quick start

```bash
cp .env.example .env
npm install
npx msw init public --save
npm run dev
```

Open http://localhost:5174

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev with MSW mocks |
| `npm run build` | Production build |
| `npm run lint` | TypeScript + ESLint |
| `npm run test:unit` | Unit tests |
| `npm run test:openapi` | OpenAPI validation |
| `npm run gate:m0` | M0 quality gate |

## Architecture

See `docs/DEVELOPER-GUIDE.md` and parent repo `docs/orderbhojan/M0-ARB-REVIEW.md`.

**Rule:** BhojanOS is SSOT. This app never reads restaurant Firestore collections.

## M0 scope

Foundation only — no discovery, menu, cart, checkout, or payments UI.
