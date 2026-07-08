# ADR-BDS-001: Bhojan Design System v1.0 Freeze

**Status:** Accepted  
**Date:** 2026-07-04  
**Deciders:** DRB, ARB

## Context

BDS-1 delivered foundation tokens and components. BDS-2 integrated BDS into OrderBhojan M0 and certified production readiness.

## Decision

1. Promote `@bhojan/design-system` to **1.0.0**
2. Set **`BDS_FROZEN = true`**
3. All new Bhojan UI work MUST consume BDS — no duplicate primitives
4. Breaking API or token changes require a new ADR and DRB approval

## Consequences

- OrderBhojan M0 shell is BDS-certified with zero custom UI components
- BhojanOS integration remains a separate approved milestone
- Patch releases (1.0.x) may fix bugs; minor releases (1.x) need DRB review

## Compliance

OrderBhojan `gate:bds2` validates adoption metrics and blocks regression to custom UI.
