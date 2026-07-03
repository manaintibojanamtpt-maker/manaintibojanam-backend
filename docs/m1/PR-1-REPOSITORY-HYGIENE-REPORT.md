# M1 PR-1 — Repository Hygiene Report

**Milestone:** M1 Foundation Refactoring — Phase 1  
**PR:** PR-1 — Repository Cleanup  
**Authority:** ADR-011, FEB-001, BHOS-SYSTEM-001  
**Date:** 2026-06-30  
**Status:** Complete (planning-only constraints satisfied)

---

## Summary

Non-functional hygiene pass: removed scratch artifacts, stripped approved debug logging, gated dev-only `window` helpers behind `import.meta.env.DEV`, removed one unused import, and added presentation-layer Firestore import guards for ADR-011 compliance going forward.

**Functional parity:** No business logic, API, schema, or feature behavior changes.

---

## Deletions

| Item | Path | Reason | Runtime impact |
|------|------|--------|----------------|
| Scratch script | `.tmp-bootstrap.js` | Agent/debug artifact (~235 KB) | None — never imported |
| Scratch script | `.tmp-checkout.js` | Agent/debug artifact (~165 KB) | None |
| Scratch script | `.tmp-mcore.js` | Agent/debug artifact (~185 KB) | None |
| Scratch script | `.tmp-ownerauth.js` | Agent/debug artifact (~2 KB) | None |

**Total removed:** ~587 KB of untracked temporary files.

---

## Debug logging removed

| File | Lines removed | Notes |
|------|---------------|-------|
| `src/services/api.ts` | 3 `console.log` in `subscribeToOrders` | Order fetch debug only; `console.error` on expire failure retained |
| `src/pages/AdminPanel.tsx` | 1 `console.log` on menu load | `console.error` on listener failure retained |
| `src/App.tsx` | 2 `console.log` in dev seeder | Block removed with DEV guard (see below) |

**Not in scope (deferred):** `server.ts`, `NotificationService.ts`, and other pre-existing production logging.

---

## Development-only guards

| Before | After |
|--------|-------|
| `window.populateSampleData`, `runEnterpriseMigration`, `runDatabaseSeeder` always attached | Wrapped in `if (import.meta.env.DEV)` in `src/App.tsx` |

**Production behavior:** Dev helpers are tree-stripped from production bundles; not callable on `www.bhojanos.com`.

---

## Unused import removed

| File | Change |
|------|--------|
| `src/pages/Menu.tsx` | Removed unused `onSnapshot` from `firebase/firestore` import |

---

## Lint / guard infrastructure (prepared, not enforced on legacy files)

| Artifact | Purpose |
|----------|---------|
| `scripts/lint/presentation-firestore-guard.mjs` | Fails CI if **new** files under `src/pages/` or `src/components/` import `firebase/firestore` |
| `scripts/lint/presentation-firestore-allowlist.txt` | Baseline of 36 existing violating files (ADR-011 strangler) |
| `eslint.config.js` | Prepared `no-restricted-imports` rule for future ESLint enablement |
| `npm run lint:presentation` | Runnable guard (added to `package.json`) |
| `.gitignore` | Added `.tmp-*` pattern |

**Policy:** New presentation code must not add direct Firestore imports. Existing files remain allowlisted until SDK migration PRs remove them.

---

## Deprecations

| Item | Status |
|------|--------|
| Direct Firestore in `src/pages/**`, `src/components/**` | **Deprecated** — allowlisted baseline; no new violations |
| Root `.tmp-*.js` scratch files | **Removed** — use `scratch/` for intentional scripts |

---

## Files changed

| File | Change type |
|------|-------------|
| `.tmp-bootstrap.js` | Deleted |
| `.tmp-checkout.js` | Deleted |
| `.tmp-mcore.js` | Deleted |
| `.tmp-ownerauth.js` | Deleted |
| `.gitignore` | Modified — `.tmp-*` |
| `package.json` | Modified — `lint:presentation` script |
| `eslint.config.js` | **Added** — prepared rule config |
| `scripts/lint/presentation-firestore-guard.mjs` | **Added** |
| `scripts/lint/presentation-firestore-allowlist.txt` | **Added** |
| `src/App.tsx` | Modified — DEV guard for window helpers |
| `src/services/api.ts` | Modified — remove debug logs |
| `src/pages/AdminPanel.tsx` | Modified — remove debug log |
| `src/pages/Menu.tsx` | Modified — unused import |
| `docs/m1/PR-1-REPOSITORY-HYGIENE-REPORT.md` | **Added** — this report |

---

## Risk assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Production relies on `window.populateSampleData` | **None** | Was never documented for prod; now DEV-only |
| Order subscription behavior change | **None** | Only removed logging; logic unchanged |
| Lint guard false positive | **Low** | Allowlist covers all current imports; guard tested |
| ESLint config without package | **None** | Documented as prepared; guard script is active path |

**Overall regression risk:** **Very low**

---

## Rollback plan

1. Revert commit for PR-1 (`git revert <sha>`).
2. No feature flags, env vars, or Firestore rules involved.
3. Restore `.tmp-*` files only if needed for local debug (not required for prod).

---

## Test plan

| Test | Command | Result |
|------|---------|--------|
| Presentation Firestore guard | `npm run lint:presentation` | ✅ Pass |
| Smoke suite | `npm run test:smoke` | ✅ 22/22 pass |
| Production web build | `npm run build:web` | ✅ (verified) |
| Typecheck | `npm run lint` | Pre-existing errors unchanged (out of PR-1 scope) |

**Manual (optional):** Dev mode — confirm `window.populateSampleData` exists in local `npm run dev`. Production — confirm helpers absent in browser console on deployed site.

---

## Deployment plan

1. Merge PR-1 to `main` (no special deploy order).
2. Vercel + Render auto-deploy — **no config changes**.
3. No Firestore rules deploy required.
4. Recommend adding `npm run lint:presentation` to CI in PR-2 (SDK scaffold).

---

## Out of scope (explicit)

- SDK package creation
- Consolidating `saveUserIfNotExists` duplicates
- `server.ts` logging cleanup
- ESLint npm package installation
- Hooks/context Firestore allowlist (future PR)
- Business logic, API, or schema changes

---

## Next step

**M1 PR-2 — SDK scaffolding** (blocked until this PR is approved and merged; ERR-002 Go still required for full M1 Phase 1).

---

*Repository Hygiene Report — M1 PR-1 — BhojanOS Engineering*
