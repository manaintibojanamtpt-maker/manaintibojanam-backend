# M4 — Search Intelligence Platform

Architecture documentation for the BhojanOS Search Intelligence Platform (M4).

**Status:** M4 PR-10 complete (v1.0 certification) — await ARB approval on ADR-014 before production rollout.

| Document | Description |
|----------|-------------|
| [SEARCH-INTELLIGENCE-PLATFORM.md](./SEARCH-INTELLIGENCE-PLATFORM.md) | Master architecture (13 sections) |
| [PHASE-1-REPOSITORY-AUDIT.md](./PHASE-1-REPOSITORY-AUDIT.md) | Detailed repository audit |
| [PR-1-SEARCH-SDK-FOUNDATION-REPORT.md](./PR-1-SEARCH-SDK-FOUNDATION-REPORT.md) | M4 PR-1 completion report |
| [PR-2-SEARCH-DOMAIN-FOUNDATION-REPORT.md](./PR-2-SEARCH-DOMAIN-FOUNDATION-REPORT.md) | M4 PR-2 completion report |
| [PR-3-SEARCH-REPOSITORY-REPORT.md](./PR-3-SEARCH-REPOSITORY-REPORT.md) | M4 PR-3 completion report |
| [PR-4-SEARCH-FACADE-REPORT.md](./PR-4-SEARCH-FACADE-REPORT.md) | M4 PR-4 completion report |
| [PR-5-SEARCH-SDK-ORCHESTRATION-REPORT.md](./PR-5-SEARCH-SDK-ORCHESTRATION-REPORT.md) | M4 PR-5 completion report |
| [PR-6-SEARCH-DISCOVERY-PIPELINE-REPORT.md](./PR-6-SEARCH-DISCOVERY-PIPELINE-REPORT.md) | M4 PR-6 completion report |
| [PR-7-MARKETPLACE-SEARCH-EXPERIENCE-REPORT.md](./PR-7-MARKETPLACE-SEARCH-EXPERIENCE-REPORT.md) | M4 PR-7 completion report |
| [PR-8-MARKETPLACE-SEARCH-FILTERS-REPORT.md](./PR-8-MARKETPLACE-SEARCH-FILTERS-REPORT.md) | M4 PR-8 completion report |
| [PR-9-AUTOCOMPLETE-SUGGESTIONS-REPORT.md](./PR-9-AUTOCOMPLETE-SUGGESTIONS-REPORT.md) | M4 PR-9 completion report |

### v1.0 Certification Pack (PR-10)

| Document | Description |
|----------|-------------|
| [SEARCH-PLATFORM-v1-CERTIFICATION.md](./v1.0/SEARCH-PLATFORM-v1-CERTIFICATION.md) | Architecture certification & Go/No-Go |
| [SEARCH-PIPELINE-CONTRACT-v1.md](./v1.0/SEARCH-PIPELINE-CONTRACT-v1.md) | Frozen pipeline contract |
| [SEARCH-PUBLIC-API-v1.md](./v1.0/SEARCH-PUBLIC-API-v1.md) | Public SDK & facade API |
| [SEARCH-COMPATIBILITY-MATRIX.md](./v1.0/SEARCH-COMPATIBILITY-MATRIX.md) | Supported clients |
| [SEARCH-TEST-MATRIX.md](./v1.0/SEARCH-TEST-MATRIX.md) | Test coverage report |
| [SEARCH-PERFORMANCE-REPORT.md](./v1.0/SEARCH-PERFORMANCE-REPORT.md) | Latency targets |
| [SEARCH-OBSERVABILITY.md](./v1.0/SEARCH-OBSERVABILITY.md) | Telemetry & analytics |
| [SEARCH-ROLLBACK.md](./v1.0/SEARCH-ROLLBACK.md) | Emergency rollback |
| [SEARCH-RELEASE-NOTES-v1.md](./v1.0/SEARCH-RELEASE-NOTES-v1.md) | Release notes |
| [ADR-014 Search Platform v1 Freeze](../adr/ADR-014-search-platform-v1-freeze.md) | ADR |

## Governance

- Discovery Platform: **frozen** — search does not modify discovery pipeline
- Marketplace Platform: **ready** — primary search UI consumer
- All `FF_SEARCH_*` flags default **OFF**

## PR series (planned)

M4 PR-1 ✅ foundation — M4 PR-2 ✅ domain — M4 PR-3 ✅ repository — M4 PR-4 ✅ facade — M4 PR-5 ✅ SDK orchestration — M4 PR-6 ✅ discovery pipeline — M4 PR-7 ✅ marketplace search UI — M4 PR-8 ✅ filters & analytics — M4 PR-9 ✅ autocomplete & suggestions — M4 PR-10 ✅ v1.0 certification — **frozen pending ARB**.
