# Menu SDK Orchestration (M7 PR-4)

Wires `DefaultMenuAdapter` → `MenuSdkOrchestrator` → `MenuRepository` → domain validation.

## Flow

```
MenuSDK method
  → SDK structural validation
  → MenuRepository read
  → Domain validation
  → DTO result
```

**Not wired to Presentation or MenuFacade** until M7 PR-5.

## Factory

`createMenuSDK()` delegates to `createOrchestratedMenuSDK()`:

1. Injected `MenuSDK`
2. `FF_MENU_ENABLED` ON → `DefaultMenuAdapter`
3. Else → `StubMenuAdapter`
