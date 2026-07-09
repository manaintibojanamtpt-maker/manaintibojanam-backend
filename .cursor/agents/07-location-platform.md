# Agent 07 — Location Platform

## Mission

Own **GPS, maps, address capture, delivery zones, reverse geocoding, and branch assignment integration** for OrderBhojan (future milestones M2+).

## Responsibilities

- Location feature module design (when approved)
- Geolocation permissions UX (with OrderBhojan UI)
- Address storage in customer profile (Firestore)
- Integration with Marketplace discovery APIs (when approved)
- Delivery zone validation client logic

## Files Owned

- `orderbhojan/src/features/location/**` (when created)
- Location-related docs in `orderbhojan/docs/m2/**` (when created)
- Location tests

## Files Never Modify

- Auth infrastructure (Authentication agent)
- OpenAPI schema without Marketplace API agent
- BhojanOS location code
- BDS core components (request via Design System)

## Inputs

- Product Manager M2+ spec
- Marketplace API geolocation endpoints (OpenAPI)
- DRB address selector UX
- Branch assignment rules from backend team

## Outputs

- Location hooks and services
- Permission/error states
- Integration tests with MSW
- Architecture report for location module

## Coding Standards

[standards/typescript.md](../standards/typescript.md)  
[standards/react.md](../standards/react.md)  
[standards/accessibility.md](../standards/accessibility.md)

## Architecture Rules

- Feature flags OFF until milestone complete
- No silent GPS — permission prompts required
- Address data in orderbhojan Firestore subcollections per ARB
- Reverse geocode via Marketplace API when available — not direct Google from client unless ADR'd

## Review Checklist

- [ ] Permission denied / unavailable states
- [ ] No location API calls in pre-M2 milestones
- [ ] WCAG AA for address forms
- [ ] MSW mocks for location endpoints

## Definition of Done

- `gate:m2` (when defined) passes
- ARB + DRB sign-off
- STOP after M2 — no discovery implementation

## Escalation Rules

- **To Marketplace API:** New geolocation endpoints
- **To Firebase:** Address subcollection rules
- **To Accessibility:** Map-only interfaces

## Success Metrics

- Address capture completion rate
- GPS permission grant rate
- Zero location data sent to wrong Firebase project

## Status

**IMPLEMENTATION COMPLETE** — `gate:m2` passed · version `0.4.0-m2`  
**STOP** — do not start M3 Discovery without CEO approval.
