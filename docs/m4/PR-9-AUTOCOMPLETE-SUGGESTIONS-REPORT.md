# M4 PR-9 — Autocomplete & Search Suggestions Platform Report

**PR:** BHOS-M4-PR9  
**Date:** 2026-06-26  
**Status:** ✅ Complete — autocomplete, suggestions, a11y, analytics; no SDK contract changes

---

## 1. UI Architecture

```
MarketplaceHome
└── MarketplaceSearchBar (combobox)
    ├── useMarketplaceAutocomplete (debounce, keyboard, cancellation)
    └── MarketplaceSearchAutocomplete (dropdown sections)
            ↑
    MarketplaceAutocompleteFacade
            ↑
    SearchFacade.autocompleteSearch / suggestSearch
            ↑
    SearchSDK.autocomplete / suggest
            ↑
    Suggestion orchestrators → SearchRepository (existing reads)
```

**Rules enforced:** No Firestore in React; no business logic in UI components; presentation consumes SearchFacade only.

---

## 2. Autocomplete Flow

1. User focuses search input → `useMarketplaceAutocomplete` opens panel (300ms debounce on typing).
2. **Empty prefix:** recent searches (session) + `SearchSDK.suggest()` when location + `FF_SEARCH_SUGGESTIONS_ENABLED`, merged with static popular/nearby/trending sections.
3. **Prefix ≥ 2 chars:** `SearchSDK.autocomplete()` when `FF_SEARCH_AUTOCOMPLETE_ENABLED` — repository restaurant prefix match + cuisine catalog filter.
4. User selects item (mouse / Enter) → analytics event → `submitSearch(label)`.
5. **Escape** closes panel; **↑/↓** moves `activeIndex`; stale responses cancelled via request id.

---

## 3. Suggestion Sources

| Source | Layer | Strategy |
|--------|-------|----------|
| Recent searches | Presentation (`recentSearchSession`) | Browser sessionStorage |
| Autocomplete restaurants | SDK orchestrator | `repository.searchRestaurants({ text: prefix })` |
| Autocomplete cuisines | SDK `SuggestionCatalog` | Prefix filter on static catalog |
| Popular cuisines | SDK + presentation fallback | Static catalog until index signals |
| Nearby cuisines | SDK + presentation fallback | Static “near you” labels (geo enrichment deferred) |
| Trending restaurants | SDK + presentation fallback | Placeholder row (“coming soon”) |

Repository `suggest()` / `autocomplete()` contracts remain `NOT_CONFIGURED`; orchestration uses existing `searchRestaurants` / `searchCuisine` reads only.

---

## 4. Accessibility Design

- Search input: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-autocomplete="list"`.
- Dropdown: `role="listbox"` with grouped `role="group"` sections and `role="option"` items.
- Keyboard: ArrowUp/ArrowDown cycle focus; Enter selects; Escape dismisses.
- Loading: visible spinner + text; errors: `role="alert"` with user-facing message.
- `onMouseDown` preventDefault on options to avoid blur-before-click race.

---

## 5. Analytics

**Module:** `searchAutocompleteAnalytics.ts` → `searchAnalytics.ts` buffer + lazy TelemetryService

| Event | When |
|-------|------|
| `SEARCH_AUTOCOMPLETE_OPENED` | Panel opens (once per focus session) |
| `SEARCH_AUTOCOMPLETE_SELECTED` | User picks autocomplete restaurant/cuisine |
| `SEARCH_SUGGESTION_CLICKED` | User picks SDK suggestion (non-recent/popular) |
| `SEARCH_RECENT_SELECTED` | User picks recent search |
| `SEARCH_POPULAR_SELECTED` | User picks popular cuisine |

---

## 6. Testing

| Suite | Coverage |
|-------|----------|
| `searchSuggestions.test.ts` | Catalog filter, orchestrators, adapter flag gates |
| `marketplaceAutocompleteFacade.test.ts` | Facade merge, SDK wiring, analytics, flag deps |
| `searchSdkOrchestration.test.ts` | Updated — suggest/autocomplete NOT_CONFIGURED when flags off |

**Verified:** `npm run test:sdk` — **301/301 pass**

Manual QA checklist:
- [ ] Debounce feels responsive (300ms)
- [ ] Keyboard navigation with screen reader
- [ ] Flags off → no dropdown / graceful static fallback
- [ ] Location missing → static sections only

---

## 7. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Static catalogs diverge from real index | SDK catalog single source; presentation mirrors for offline fallback |
| Trending placeholder confuses users | Labelled “coming soon”; low score |
| Extra repository reads on keystroke | Debounce + cancellation; min 2-char prefix |
| Feature flag partial enable | Independent `FF_SEARCH_AUTOCOMPLETE_ENABLED` / `FF_SEARCH_SUGGESTIONS_ENABLED` |

---

## 8. Rollback

1. Set `FF_SEARCH_AUTOCOMPLETE_ENABLED=false` and `FF_SEARCH_SUGGESTIONS_ENABLED=false` (default).
2. `DefaultSearchAdapter` returns `NOT_CONFIGURED` for suggest/autocomplete.
3. UI falls back to static popular/nearby sections when panel enabled via marketplace flags; full disable via `FF_SEARCH_ENABLED=false`.
4. `StubSearchAdapter` unchanged for emergency rollback.

---

## 9. Definition of Done

- [x] Autocomplete dropdown with debounce, loading/empty/error states
- [x] Search suggestions (recent, popular, nearby, trending placeholder)
- [x] Keyboard navigation (↑↓ Enter Escape) + mouse selection
- [x] Accessibility (combobox/listbox ARIA)
- [x] Analytics events (5 types)
- [x] Feature flags default OFF
- [x] No SearchSDK / DiscoverySDK / SearchRepository contract changes
- [x] No AI / semantic / embeddings
- [x] Tests + report

**Await Architecture Review Board approval before M4 PR-10.**
