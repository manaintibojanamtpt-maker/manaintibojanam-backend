# Menu Facade (M7 PR-5)

**Presentation entry point for menu reads.** UI must import from here — never from `MenuSDK` directly.

## Architecture

```
Future UI
    ↓
MenuFacade (this module)
    ↓
MenuSDK
    ↓
Repository → Domain
```

## Session statuses

`idle` · `loading` · `success` · `empty` · `error` · `disabled` · `retry` · `cancelled`

## Feature flag

`FF_MENU_ENABLED` (default OFF)

**STOP.** Await ARB approval before M7 PR-6.
