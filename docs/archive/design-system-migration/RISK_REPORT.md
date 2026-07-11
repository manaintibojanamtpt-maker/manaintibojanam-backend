# Phase 5 — Risk Report

**Agent:** Design System Stabilization  
**Date:** 2026-07-10  
**Severity:** Critical / High / Medium / Low

---

## Risks introduced

| ID | Risk | Severity | Status | Mitigation |
|----|------|----------|--------|------------|
| R5-01 | Slot props change BottomNav/Header API | Low | **Accepted** | Optional props default `null`; App wires containers |
| R5-02 | ActiveOrderStrip split view/container drift | Medium | **Mitigated** | View copied verbatim from original JSX |
| R5-03 | Barrel static+dynamic import bloat | Medium | **Open** | Documented in PERFORMANCE_REPORT; Phase 6 lazy entries |
| R5-04 | `PulseSkeleton` rename breaks marketing imports | Low | **Mitigated** | `ui/Skeleton` stub still re-exports pulse `Skeleton` |
| R5-05 | Tokens exist but not active — drift from `index.css` | Medium | **Open** | Phase 7 wires `styles/index.css` |
| R5-06 | DS still imports contexts/hooks (OrderTracking, Banner) | High | **Accepted** | Phase 6 adapter injection for OrderBhojan |
| R5-07 | StorefrontInstallButtonView unused `onOpenGuide` removed | Low | **Resolved** | Cleaned interface |

---

## Risks resolved in Phase 5

| ID | Risk | Resolution |
|----|------|------------|
| R3-06 | DS imports from `src/components/` | **Eliminated** — 0 leaks |
| R4-02 | Deep imports in Founder Store | **Eliminated** — barrel only |
| R3-03 | Skeleton barrel collision | **Resolved** — `PulseSkeleton` alias |

---

## Risks NOT introduced

| Check | Result |
|-------|--------|
| Visual / JSX changes | View extraction is pixel-identical |
| OrderBhojan touched | ❌ No |
| BDS / Experience CSS deleted | ❌ No |
| Global token activation | ❌ No |
| Firestore logic changed | ❌ No — only moved JSX to View |

---

## Rollback plan

```powershell
# Revert Phase 5 coupling changes
git checkout HEAD -- src/design-system/layout/
git checkout HEAD -- src/components/ActiveOrderStrip.tsx
git checkout HEAD -- src/components/StorefrontInstallButton.tsx
git checkout HEAD -- src/components/BottomSheet.tsx
git checkout HEAD -- src/App.tsx
```

Or full Phase 5 rollback:

```powershell
git checkout HEAD -- src/design-system/ src/App.tsx src/pages/ src/components/ActiveOrderStrip.tsx src/components/StorefrontInstallButton.tsx src/components/BottomSheet.tsx
```

---

## Approval recommendation

Phase 5 achieves **zero internal component leaks** and a **complete public API** without visual changes. Proceed to Phase 6 (OrderBhojan migration) with adapter pattern for hooked components.

**STOP** — await Chief Architect approval before Phase 6.
