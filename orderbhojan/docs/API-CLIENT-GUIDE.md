# API Client Guide — OrderBhojan M0

## Usage

```typescript
import { getMarketplaceApiClient } from '@/marketplace-api';

const client = getMarketplaceApiClient();
const health = await client.health();
const discover = await client.discover({ lat: 17.385, lng: 78.4867, rails: 'nearby' });
```

## Headers (automatic)

- `X-Correlation-Id` — session trace ID
- `X-Marketplace-API-Version` — `1.0`
- `Authorization: Bearer …` — when Firebase auth bound
- `X-Context-Token` — branch session (M5+)

## Errors

All failures throw `MarketplaceApiError` with `code`, `message`, `retryable`.

## Contract

OpenAPI: `openapi/marketplace-api.yaml`  
Mocks: `src/marketplace-api/mocks/handlers.ts`

## Rules

- Never call legacy BhojanOS `/api/*` routes from OrderBhojan
- Never compute GST/delivery client-side (M8 uses `/quote` only)
