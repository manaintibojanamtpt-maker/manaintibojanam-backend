# SearchSDK — Providers

**Status:** Placeholder (M4 PR-1)

Future Firestore scan and denormalized index adapters will live here:

| Provider | PR | Flag |
|----------|-----|------|
| `StubSearchProvider` | PR-1 | default |
| `FirestoreScanSearchProvider` | PR-3 | `FF_SEARCH_ENABLED` |
| `DenormalizedIndexSearchProvider` | post-M4 | ADR required |

Presentation **must not** import providers directly — use `createSearchSDK()`.
