# Analytics parity matrix (hybrid ↔ native)

**STATUS: PHASE 0 LOCKED — 2026-07-31**

Native must emit the same event **names**. Payloads may add `client: android|ios|web` and `impl: hybrid|native`.

## Core `trackEvent` pipeline
| Event | Hybrid source | Native required | Payload notes |
|-------|---------------|-----------------|---------------|
| `app_boot` | TelemetryProvider | Yes | platform, appVersion |
| `app_ready` | main.tsx | Yes | cold_start ms |
| `auth_state_changed` | AuthProvider | Yes | signed_in / guest / signed_out |
| `api_error` | trackError / boundary | Yes | status, path (no PII) |
| `feature_flag_evaluated` | useFeatureFlag | Yes (sampled OK) | flag, value |
| `api_request` | defined, unused | Optional | keep unused until instrumented |

## Search
| Event | Native required |
|-------|-----------------|
| `search_submit` | Yes (when search native) |
| `search_no_results` | Yes |
| `search_result_click` | Yes |
| `search_suggestion_click` | Yes |
| `search_filter_apply` | Yes |
| `search_clear` | Yes |

## Perf marks (parity as named marks / spans)
`app_start`, `first_paint`, `discovery_fetch_start/end`, `cart_to_checkout`, `checkout_prepare_start/end`, `checkout_bill_ready`, `pay_tap`, `pay_next_step`

## First-slice track events (must ship with native track)
| Event | When |
|-------|------|
| `native_track_open` | Native track screen shown |
| `native_track_fallback_hybrid` | Flag off or error → WebView |
| `order_track_poll` | Poll tick (sample) |
| `order_track_status_change` | Status transition |
| `push_open_track` | Opened from notification |

## Voice / dual-run (leave hybrid until later)
Keep `voiceCore*` counters on hybrid until voice native phase.
