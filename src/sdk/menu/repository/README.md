# Menu Repository (M7 PR-3)

Persistence abstraction for MenuSDK. **Not wired into `createMenuSDK()`** until M7 PR-4.

## Resolution

```
createMenuRepository()
  1. Injected MenuRepository
  2. FF_MENU_ENABLED ON + MenuPersistencePort → MenuRepositoryAdapter
  3. StubMenuRepository (NOT_CONFIGURED)
```

## Layers

| Layer | Responsibility |
|-------|----------------|
| `MenuPersistencePort` | Raw persistence reads (contract only) |
| `MenuRepositoryAdapter` | Record → DTO mapping |
| `MenuRepository` | SDK repository contract (M7 PR-1) |

Business rules remain in `src/domain/menu/`.

**STOP.** Await ARB approval before M7 PR-4 orchestration.
