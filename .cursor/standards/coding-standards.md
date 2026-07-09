# Coding Standards

## Purpose

Baseline conventions for all Bhojan code — human and AI authored.

## General Principles

1. **Minimize scope** — smallest correct change for the milestone.
2. **Match existing patterns** — read surrounding code before writing.
3. **No drive-by refactors** — unrelated cleanup belongs in a refactor playbook.
4. **Self-documenting code** — comments only for non-obvious business logic.
5. **Feature flags OFF by default** — opt-in via env or config.

## File Organization

```
orderbhojan/src/
├── features/<domain>/     # Domain logic + UI for that feature
├── components/            # Shared presentational components
├── hooks/                 # Shared hooks (cross-feature)
├── lib/                   # Utilities, clients
├── config/                # Static configuration
├── styles/                # Global and layer CSS
└── routes/                # Router definitions
```

## Naming

| Item | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `MarketplaceLayout.tsx` |
| Hooks | camelCase, `use` prefix | `useScrollChrome.ts` |
| Utils | camelCase | `formatPrice.ts` |
| Constants | SCREAMING_SNAKE | `MAX_CART_ITEMS` |
| CSS files | kebab-case | `experience-premium.css` |
| Test files | `*.test.ts(x)` | `m16-premium.test.ts` |

## Imports

- Absolute imports via path aliases where configured
- Group: external → internal → relative → styles
- No circular dependencies between features

## Error Handling

- User-facing errors: friendly copy via BDS Toast/Alert patterns
- Log technical details to console in dev only — never log tokens/PII
- API errors: map through centralized error handler (Marketplace API agent)

## Secrets

- Never commit `.env`, service account JSON, or API secrets
- Use `.env.example` with placeholder keys only
- Firebase public config is OK in client — not private keys

## Git

- One milestone per PR when possible
- Conventional milestone prefix in title: `[M1.6]`
- No force push to main

## Agent Boundaries

Each agent modifies only **Files Owned** — see individual agent docs in [agents/](../agents/).

## Related Standards

- [typescript.md](typescript.md)
- [react.md](react.md)
- [firebase.md](firebase.md)
- [testing.md](testing.md)
- [accessibility.md](accessibility.md)
- [design-system.md](design-system.md)
- [performance.md](performance.md)
