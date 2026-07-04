# OrderBhojan — Setup Guide

## Prerequisites

- Node.js 20+
- npm 10+
- Firebase project `orderbhojan` (for M1+ auth; optional in M0 dev)

## Local setup

```bash
cd orderbhojan
cp .env.example .env
npm install
npx msw init public --save
npm run dev
```

## Environment variables

| Variable | Required (dev) | Description |
|----------|------------------|-------------|
| `VITE_MSW_ENABLED` | No | `true` enables mock API (default in dev) |
| `VITE_MARKETPLACE_API_URL` | No | Empty = same origin for MSW |
| `VITE_FIREBASE_*` | No | Required for production auth |

## Vercel deployment

1. Import `orderbhojan` repository
2. Framework preset: Vite
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set production env vars (Firebase, `VITE_MSW_ENABLED=false`)

## Firebase

M0 initializes Auth SDK only. No Firestore collections created.

M1 will deploy security rules for customer collections.

## Quality gate

```bash
npm run gate:m0
```

Must pass before M0 exit review.
