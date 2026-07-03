# Menu Projection Soak & Certification (M7 PR-9)

Evidence-only soak analysis over menu parity reports. **No MenuSDK routing. No adapter switch.**

## Architecture

```
Parity Reports → MenuProjectionSoakRunner → MenuProjectionAnalyzer → Certification Report → STOP
```

## Feature flags

- `FF_MENU_PROJECTION_ENABLED`
- `FF_MENU_PROJECTION_PARITY_ENABLED`
- `FF_MENU_PROJECTION_SOAK_ENABLED` (default OFF)

## Factory

`createMenuProjectionSoakInfrastructure()`

**STOP.** Await ARB approval before M7 PR-10 (Menu Operational Validation).
