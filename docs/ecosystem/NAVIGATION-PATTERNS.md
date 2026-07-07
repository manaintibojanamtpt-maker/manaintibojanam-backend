# Navigation Patterns

**Owner:** Ecosystem Guardian (19) · **Version:** 1.1.0

Canonical navigation patterns across customer-facing products.

## OrderBhojan (Reference — M1.6)

| Pattern | Implementation | Route |
|---------|----------------|-------|
| Primary bottom nav | Floating island, 4–5 tabs | Home, Search, Cart, Orders, Profile |
| Guest profile | Profile accessible without auth | `/profile` |
| Protected orders | RequireAuth wrapper | `/orders` |
| Scroll chrome | Glass header on scroll | `useScrollChrome` |

## Rules for Future Products

1. Reuse bottom-nav island pattern for mobile customer apps
2. Auth-gated routes use shared `RequireAuth` semantics
3. Back navigation: stack-based, consistent icon (BDS)
4. Do not invent parallel tab labels — use glossary terms

## Cross-Product Alignment

| Product | Status | Align to OrderBhojan M1.6 |
|---------|--------|---------------------------|
| Delivery Partner | Future | Adapt for driver context |
| Android / iOS | Future | Native shell, same tab semantics |
| BhojanOS Admin | Future | Sidebar (desktop-first exception) |

Changes require DRB + Ecosystem Guardian approval.
