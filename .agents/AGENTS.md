# BhojanOS Operational Rules

## FEATURE FREEZE (Conditionally Lifted - August 2026)

**STATUS:** The Founder Beta PMF Validation Phase feature freeze is **conditionally lifted** following the completion of the 24-hour security blockers (SEC-1, SEC-2, SEC-3).

New product modules and OrderBhojan milestones (M7+) may now resume, provided they adhere to strict security and observability checks.
- New product modules or major features
- New dashboards or structural redesigns
- New AI agent workflows
- New subscription plan tiers

You may ONLY implement:
- Bug fixes and stability improvements
- Merchant onboarding friction reduction
- Performance optimizations
- Adjustments to the activation funnel to improve conversion rates

## PMF Validation Objectives

Every action taken during this phase must directly answer at least one of these questions:
1. Does this help the merchant make more money?
2. Does this increase merchant retention?
3. Does this push a merchant from 'Draft' to 'Published' faster?
4. Does this reduce the load on the support team?

If a user request violates the feature freeze, remind the user of the Founder Beta Phase and suggest focusing on the core PMF metrics instead.

## Governance & program status (June 2026)

- **Single source of truth:** [docs/PROGRAM-STATUS.md](../docs/PROGRAM-STATUS.md)
- **BAEO v1.1** governance files exist under `.cursor/` and `docs/baeo/` but **agent activation is SUSPENDED** during this freeze (new AI workflows are prohibited).
- **OrderBhojan** implementation lives in `orderbhojan/` (M0–M6.5 complete on `main`). Do **not** treat `docs/orderbhojan/` as current status — it is an archived pre-implementation ARB draft pack.
- **OrderBhojan milestones M7+ and production launch are now AUTHORIZED** following the conditional freeze lift (August 2026).
