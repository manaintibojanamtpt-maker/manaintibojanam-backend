# DiscoverySDK

**Version:** `0.6.0-geoindex` (`DISCOVERY_SDK_VERSION`)  
**Status:** Full pipeline + geoIndex repository — flags OFF by default  
**Mission:** Read-only discovery intelligence — *"Which BhojanOS branches can serve this customer?"*

---

## Architecture

```
Presentation → DiscoveryFacade → DiscoverySDK → LocationSDK + DiscoveryRepository → Firestore (read-only)
```

Presentation **must not** access Firestore for discovery.

---

## Module Layout

| Path | Purpose |
|------|---------|
| `contracts/DiscoverySDK.ts` | Public SDK interface |
| `dto/` | Read-only DTOs |
| `repository/DiscoveryRepository.ts` | Read-only repository port |
| `ranking/RankingEngine.ts` | Ranking port + weight constants |
| `filters/DiscoveryFilters.ts` | Pipeline filter stage types |
| `providers/` | Future Firestore adapters |
| `core/featureFlags.ts` | Feature flag defaults (all OFF) |
| `errors/` | Error message constants |
| `types/` | Branded types + barrel |
| `version.ts` | Version + frozen flag |

---

## Feature Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `FF_DISCOVERY_ENABLED` | OFF | Master discovery gate |
| `FF_DISCOVERY_RANKING_ENABLED` | OFF | Weighted ranking |
| `FF_DISCOVERY_MARKETPLACE_ENABLED` | OFF | Marketplace UI |
| `FF_DISCOVERY_TENANT_REPOSITORY_ENABLED` | OFF | Tenant-as-branch repository |
| `FF_DISCOVERY_ELIGIBILITY_ENABLED` | OFF | Eligibility stage |
| `FF_DISCOVERY_GEOINDEX_ENABLED` | OFF | GeoIndex repository path |

---

## Constraints (M3)

- **Read-only** — no Firestore writes
- **No checkout / payment / ordering changes**
- **No customer UI in foundation PR**
- OrderSDK v1.0.0 frozen (ADR-013)

---

## Documentation

- [`docs/m3/DISCOVERY-INTELLIGENCE-PLATFORM.md`](../../../docs/m3/DISCOVERY-INTELLIGENCE-PLATFORM.md)
- [`docs/m3/PHASE-1-REPOSITORY-AUDIT.md`](../../../docs/m3/PHASE-1-REPOSITORY-AUDIT.md)

---

**STOP.** Await Architecture Review Board approval before M3-PR-2 implementation.
