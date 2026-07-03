# ReferenceSDK Adapters

**M2 PR-5** — static India bundle adapter.

## Flow

```
createReferenceSDK()
  → ReferenceBundleAdapter (ReferenceSDK)
    → ReferenceBundleRepository (ReferenceRepository)
      → StaticBundleProvider
        → ReferenceBundlePort.load()
          → loadIndiaReferenceBundle() / JSON files
```

## Validation on load

1. `validateReferenceBundleManifest` — version `2026.07`, schema, counts  
2. `assertValidIndiaReferenceBundle` — hierarchy integrity (PR-4)

## Cache

Module singleton in `bundleCache.ts` — one indexed bundle per process.  
Test reset: `resetStaticBundleProviderCache()`.

## Injection

```typescript
import { createReferenceSDK, type ReferenceBundlePort } from '@/sdk';

const sdk = createReferenceSDK(customPort);
```
