# BhojanOS Search Domain (`src/domain/search`)

**Status:** M4 PR-2 — pure domain logic implemented  
**Version:** `SEARCH_DOMAIN_VERSION = 0.1.0-domain`

## Purpose

Search domain rules independent of React, Firebase, DiscoverySDK, and SearchSDK.

Per BHOS-PAF-001 and ADR-011:

- **SDK** orchestrates infrastructure and calls **domain** for pure logic
- **Domain** must not import SDK, Firestore, Discovery, or HTTP

## Modules

| Folder | Components |
|--------|------------|
| `shared/` | `SearchMatchType`, `SearchConstants`, `SearchLanguage`, `SearchValidation`, types |
| `normalize/` | `SearchTokenizer`, `QueryNormalizer` |
| `matching/` | `SearchMatchClassifier` |
| `filters/` | `SearchFilterEvaluator` |
| `ranking/` | `SearchWeights`, `SearchScore` |

## Design principles

- **Pure** — no side effects
- **Stateless** — all functions are deterministic
- **Explainable** — scores expose factor breakdowns

## Related

- SDK contracts: `src/sdk/search/`
- Architecture: `docs/m4/SEARCH-INTELLIGENCE-PLATFORM.md`
- PR-2 report: `docs/m4/PR-2-SEARCH-DOMAIN-FOUNDATION-REPORT.md`
