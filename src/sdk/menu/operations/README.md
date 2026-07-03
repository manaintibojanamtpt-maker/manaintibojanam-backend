# Menu Operational Validation (M7 PR-10)

Menu projection operational validation. **Evidence only — no production changes.**

## Architecture

```
Legacy Menu → Shadow Projection → Parity → Soak → Operational Validation → Readiness Report → STOP
```

## Feature Flags (ALL required, default OFF)

- `FF_MENU_PROJECTION_ENABLED`
- `FF_MENU_PROJECTION_PARITY_ENABLED`
- `FF_MENU_PROJECTION_SOAK_ENABLED`
- `FF_MENU_OPERATIONAL_VALIDATION_ENABLED`

## Usage

```typescript
import { createMenuOperationalInfrastructure } from '@/sdk/menu/operations/MenuOperationalFactory';

const ops = createMenuOperationalInfrastructure({ featureFlags });
const result = await ops.validate('menu-catalog-read-shadow');
```

**STOP.** No adapter switch. Await ARB approval before PR-11.
