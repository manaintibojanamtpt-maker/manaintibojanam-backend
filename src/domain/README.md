# BhojanOS Domain Layer (`src/domain`)

**Status:** M1 PR-2 — boundary folders only (no logic)

## Purpose

Future home for **domain models and rules** that are independent of React and Firebase.

Per BHOS-PAF-001 and ADR-011:

- **Presentation** consumes the **SDK**
- **SDK** orchestrates calls into **Domain** and **Platform Services**
- **Domain** must not import React, Firestore, or Express

## Modules (planned)

| Folder | Bounded context |
|--------|-----------------|
| `orders/` | Order lifecycle, FSM (M1+ / M5) |
| `customers/` | Customer profile, loyalty |
| `menu/` | Menu catalog, pricing snapshots |
| `inventory/` | Stock, recipes |
| `branch/` | Multi-branch (TDD future) |
| `location/` | Location domain rules (M2 PR-2 scaffold) |
| `payments/` | Payment rails, verification |
| `notifications/` | Notification intents |

**No files with business logic in PR-2.** Implementations arrive in later milestones.
