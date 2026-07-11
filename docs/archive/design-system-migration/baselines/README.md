# Visual & Functional Regression Baselines

Phase 6 discovery migration baselines for milestones 2A (Home), 2B (Listing), and 2C (Search).

## Structure

Each milestone folder contains:

| File | Purpose |
|------|---------|
| `desktop.png` | 1440×900 viewport screenshot |
| `tablet.png` | 768×1024 viewport screenshot |
| `mobile.png` | 390×844 viewport screenshot |
| `dom-tree.json` | Component hierarchy snapshot |
| `lighthouse.md` | Lighthouse capture protocol + scores |
| `metrics.json` | Build bundle metrics at milestone completion |

## Screenshot capture

```bash
cd orderbhojan && npm run dev
```

Enable required feature flags in dev config, then capture:

| Milestone | Route | Flags |
|-----------|-------|-------|
| 2A-home | `/` | Discovery OFF (mock feed) or ON |
| 2B-listing | `/` with discovery ON | Scroll to collection rails |
| 2C-search | `/search` | Search ON |

Use Chrome DevTools device toolbar or Playwright. Save PNGs into the corresponding baseline folder.

## Status

| Milestone | dom-tree | metrics | lighthouse | screenshots |
|-----------|----------|---------|------------|-------------|
| 2A-home | ✅ | ✅ | ✅ protocol | ⏳ manual capture |
| 2B-listing | ✅ | ✅ | ✅ protocol | ⏳ manual capture |
| 2C-search | ✅ | ✅ | ✅ protocol | ⏳ manual capture |
| 2D-ux-states | ✅ | ✅ | ✅ protocol | ⏳ manual capture |
