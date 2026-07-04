# Testing Guide — OrderBhojan M0

## Commands

```bash
npm run test:unit      # Infrastructure unit tests
npm run test:openapi   # OpenAPI contract validation
npm run gate:m0        # Full M0 quality gate
```

## Coverage (M0)

| Area | Test file |
|------|-----------|
| Config validation | `tests/config.test.ts` |
| Feature flags | `tests/featureFlags.test.ts` |
| Marketplace HTTP client | `tests/marketplaceClient.test.ts` |
| MSW handlers | `tests/mswHandlers.test.ts` |

## MSW

Development uses MSW when `VITE_MSW_ENABLED=true`. Run `npx msw init public --save` after clone.

## M1+

Add Playwright E2E and contract tests against staging Marketplace API when handlers ship on BhojanOS.
